require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = Number(process.env.PORT || 8080);

// Log request lifecycle without recording authorization headers or personal data.
app.use((req, res, next) => {
 const startedAt = Date.now();
 console.log("[HTTP] Started", req.method, req.path);
 res.on("finish", () => console.log("[HTTP] Finished", req.method, req.path, res.statusCode, Date.now() - startedAt + "ms"));
 res.on("close", () => {
  if (!res.writableEnded) console.warn("[HTTP] Connection closed before response", req.method, req.path, Date.now() - startedAt + "ms");
 });
 next();
});

// Allow only the production frontend and explicit local development origins.
// Set CORS_ORIGIN as a comma-separated allowlist in Render/local .env to override defaults.
const configuredCorsOrigins = String(process.env.CORS_ORIGIN || "")
 .split(",").map(origin => origin.trim()).filter(Boolean);
const allowedCorsOrigins = new Set(configuredCorsOrigins.length ? configuredCorsOrigins : [
 "https://hardware-inventory-webapp.netlify.app",
 "http://localhost:5173",
 "http://127.0.0.1:5173"
]);
app.use(cors({
 origin(origin, callback) {
  // Requests without an Origin header (health checks, server-to-server, CLI) are not browser CORS requests.
  if (!origin || allowedCorsOrigins.has(origin)) return callback(null, true);
  console.warn("[CORS] Blocked browser origin:", origin);
  return callback(null, false);
 },
 methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
 allowedHeaders: ["Content-Type", "Authorization"],
 optionsSuccessStatus: 204
}));
app.use(express.json({ limit: "1mb" }));
const sslEnabled = String(process.env.DB_SSL || "").toLowerCase() === "true" || Boolean(process.env.DB_SSL_CA);
let databaseSsl;
if (sslEnabled) {
 const caPath = process.env.DB_SSL_CA
  ? path.resolve(__dirname, process.env.DB_SSL_CA)
  : null;
 if (!caPath) {
  throw new Error("DB_SSL is enabled but DB_SSL_CA is missing. Download the Aiven CA certificate and set DB_SSL_CA=./certs/ca.pem.");
 }
 if (!fs.existsSync(caPath)) {
  throw new Error("Database CA certificate not found at " + caPath + ". Save the Aiven CA certificate there or update DB_SSL_CA.");
 }
 databaseSsl = { ca: fs.readFileSync(caPath, "utf8"), rejectUnauthorized: true };
}
const pool = mysql.createPool({
 host: process.env.DB_HOST || "127.0.0.1", port: Number(process.env.DB_PORT || 3306),
 user: process.env.DB_USER || "root", password: process.env.DB_PASSWORD || "",
 database: process.env.DB_NAME || "hardware_inventory_v2", waitForConnections: true,
 connectionLimit: 10, queueLimit: 0, dateStrings: true, decimalNumbers: true,
 connectTimeout: 10000, enableKeepAlive: true, keepAliveInitialDelay: 0,
 ssl: databaseSsl
});
const route = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const positiveInt = v => Number.isInteger(Number(v)) && Number(v) > 0;
const dateValue = v => v || new Date().toISOString().slice(0, 10);
const crypto = require("crypto");
const SOURCE_DATABASE = String(process.env.DB_NAME || "hardware_inventory_v2");

function parseTrashData(value) {
 if (value && typeof value === "object") return value;
 try { return JSON.parse(String(value || "{}")); } catch { return {}; }
}
async function saveDeletedRecord(connection, uid, type, row, batchId = null) {
 const originalId = Number(row.id);
 const productId = type === "products" ? originalId : Number(row.product_id);
 await connection.execute(
  "INSERT INTO deleted_records (user_uid,source_database,record_type,original_record_id,original_product_id,delete_batch_id,record_data,deleted_by,deleted_at,expires_at) VALUES (?,?,?,?,?,?,?, ?,NOW(),DATE_ADD(NOW(),INTERVAL 30 DAY))",
  [uid,SOURCE_DATABASE,type,originalId,Number.isInteger(productId) && productId > 0 ? productId : null,batchId,JSON.stringify(row),uid]
 );
}
async function insertDeletedSourceRow(connection, type, row) {
 const allowedTypes = new Set(["products","stock_in","sales","damaged_items"]);
 if (!allowedTypes.has(type) || !row || !Number.isInteger(Number(row.id))) {
  throw Object.assign(new Error("Deleted record data is invalid."),{status:400});
 }
 // The JSON snapshot came from SELECT * on this exact source table.
 // Restore every original column, including future schema additions.
 const columns = Object.keys(row);
 if (!columns.includes("id") || columns.some(key => !/^[A-Za-z0-9_]+$/.test(key))) {
  throw Object.assign(new Error("Deleted record contains invalid column data."),{status:400});
 }
 const names = columns.map(key => "`"+key+"`").join(",");
 const marks = columns.map(() => "?").join(",");
 await connection.execute("INSERT INTO `"+type+"` ("+names+") VALUES ("+marks+")",columns.map(key => row[key]));
}
async function archiveProductTree(connection, uid, productId) {
 const [products] = await connection.execute("SELECT * FROM products WHERE id=? AND user_uid=? FOR UPDATE",[productId,uid]);
 if (!products.length) throw Object.assign(new Error("Product not found."),{status:404});
 const product = products[0], batchId = crypto.randomUUID();
 const related = [
  ["stock_in","stockIn"],
  ["sales","sales"],
  ["damaged_items","damaged"]
 ];
 const counts = {products:1,stockIn:0,sales:0,damaged:0};
 for (const [table,key] of related) {
  const [rows] = await connection.execute("SELECT * FROM `"+table+"` WHERE product_id=? FOR UPDATE",[productId]);
  for (const row of rows) await saveDeletedRecord(connection,uid,table,row,batchId);
  if (rows.length) await connection.execute("DELETE FROM `"+table+"` WHERE product_id=?",[productId]);
  counts[key] = rows.length;
 }
 await saveDeletedRecord(connection,uid,"products",product,batchId);
 await connection.execute("DELETE FROM products WHERE id=? AND user_uid=?",[productId,uid]);
 return counts;
}
async function archiveTransaction(connection, uid, type, id) {
 const table = type;
 const [rows] = await connection.execute(
  "SELECT t.* FROM `"+table+"` t INNER JOIN products p ON p.id=t.product_id WHERE t.id=? AND p.user_uid=? FOR UPDATE",
  [id,uid]
 );
 if (!rows.length) throw Object.assign(new Error("Record not found."),{status:404});
 const row = rows[0];
 const [products] = await connection.execute("SELECT stock FROM products WHERE id=? AND user_uid=? FOR UPDATE",[row.product_id,uid]);
 if (!products.length) throw Object.assign(new Error("Related product not found."),{status:404});
 const quantity = Number(row.quantity);
 if (type === "stock_in") {
  if (Number(products[0].stock) < quantity) throw Object.assign(new Error("Cannot delete: some received units have already been used."),{status:409});
  await connection.execute("UPDATE products SET stock=stock-? WHERE id=? AND user_uid=?",[quantity,row.product_id,uid]);
 } else {
  await connection.execute("UPDATE products SET stock=stock+? WHERE id=? AND user_uid=?",[quantity,row.product_id,uid]);
 }
 await saveDeletedRecord(connection,uid,type,row);
 await connection.execute("DELETE FROM `"+table+"` WHERE id=?",[id]);
 return row;
}
async function purgeExpiredTrash(uid) {
 if (uid) {
  await pool.execute("DELETE FROM deleted_records WHERE user_uid=? AND (expires_at<=NOW() OR source_database<>?)",[uid,SOURCE_DATABASE]);
 } else {
  await pool.execute("DELETE FROM deleted_records WHERE expires_at<=NOW() OR source_database<>?",[SOURCE_DATABASE]);
 }
}

async function productBy(connection, value, lock = false, uid) {
 const sql = "SELECT * FROM products WHERE user_uid=? AND (id=? OR LOWER(product)=LOWER(?)) LIMIT 1" + (lock ? " FOR UPDATE" : "");
 const [rows] = await connection.execute(sql, [uid, Number(value) || -1, String(value || "")]); return rows[0] || null;
}
const productDto = r => ({ id:r.id, product:r.product, category:r.category, buy:String(r.buy), sell:String(r.sell), stock:String(r.stock) });
const stockDto = r => ({ id:r.id, product:r.product, quantity:String(r.quantity), date:r.date, amount:String(r.total_cost ?? (Number(r.unit_cost || 0) * Number(r.quantity || 0))), unitCost:Number(r.unit_cost || 0), note:r.note || "" });
const saleDto = r => ({ id:r.id, product:r.product, quantity:String(r.quantity), date:r.date, amount:String(r.amount), unitCost:Number(r.unit_cost), profit:Number(r.profit), note:r.note || "" });
const damagedDto = r => ({ id:r.id, product:r.product, quantity:String(r.quantity), date:r.date, unitCost:String(r.unit_cost ?? 0), loss:String(r.total_loss ?? 0), reason:r.reason || "" });
app.get("/", (req, res) => res.json({ name: "Hardware Inventory API", status: "running" }));
app.get("/api/health", route(async (req,res) => {
 const firebaseReady = Boolean(firebaseAdminApp);
 let databaseReady = false;
 let databaseError = null;

 try {
  await pool.query("SELECT 1");
  databaseReady = true;
 } catch (error) {
  databaseError = error.message;
  console.warn("[HEALTH] MySQL is not ready:", databaseError);
 }

 const ready = databaseReady && firebaseReady;
 res.status(ready ? 200 : 503).json({
  status: ready ? "ok" : "starting",
  database: databaseReady ? "connected" : "unavailable",
  firebaseAdmin: firebaseReady ? "configured" : "not_configured"
 });
}));
app.get("/api/product", requireFirebaseUser, requireActiveUser, route(async (req,res) => { const [rows]=await pool.execute("SELECT * FROM products WHERE user_uid=? ORDER BY id DESC",[req.firebaseUser.uid]); res.json(rows.map(productDto)); }));
app.post("/api/product", requireFirebaseUser, requireActiveUser, route(async (req,res) => {
 const b=req.body;
 if(!String(b.product||"").trim()||!String(b.category||"").trim()||!Number.isFinite(Number(b.buy))||Number(b.buy)<0||!Number.isFinite(Number(b.sell))||Number(b.sell)<0||!Number.isInteger(Number(b.stock??0))||Number(b.stock??0)<0) return res.status(400).json({message:"Enter valid product details and non-negative whole-number stock."});
 const c=await pool.getConnection();
 try {
  await c.beginTransaction();
  const initialStock=Number(b.stock??0);
  const [r]=await c.execute("INSERT INTO products(user_uid,product,category,buy,sell,stock) VALUES(?,?,?,?,?,?)",[req.firebaseUser.uid,b.product.trim(),b.category.trim(),Number(b.buy),Number(b.sell),initialStock]);
  if(initialStock>0) await c.execute("INSERT INTO stock_in(product_id,quantity,unit_cost,total_cost,date,note) VALUES(?,?,?,?,CURDATE(),?)",[r.insertId,initialStock,Number(b.buy),Number(b.buy)*initialStock,"Opening stock"]);
  const [rows]=await c.execute("SELECT * FROM products WHERE id=? AND user_uid=?",[r.insertId,req.firebaseUser.uid]);
  await c.commit();
  res.status(201).json(productDto(rows[0]));
 } catch(error) { await c.rollback(); throw error; } finally { c.release(); }
}));
app.put("/api/product/:id", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{ const b=req.body,id=Number(req.params.id); if(!Number.isInteger(id)||id<1||!String(b.product||"").trim()||!String(b.category||"").trim()||!Number.isFinite(Number(b.buy))||Number(b.buy)<0||!Number.isFinite(Number(b.sell))||Number(b.sell)<0||!Number.isInteger(Number(b.stock))||Number(b.stock)<0) return res.status(400).json({message:"Invalid product details."}); const [r]=await pool.execute("UPDATE products SET product=?,category=?,buy=?,sell=?,stock=? WHERE id=? AND user_uid=?",[b.product.trim(),b.category.trim(),Number(b.buy),Number(b.sell),Number(b.stock),id,req.firebaseUser.uid]); if(!r.affectedRows)return res.status(404).json({message:"Product not found."}); const [rows]=await pool.execute("SELECT * FROM products WHERE id=? AND user_uid=?",[id,req.firebaseUser.uid]); res.json(productDto(rows[0])); }));
app.delete("/api/product/:id", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{ const id=Number(req.params.id),uid=req.firebaseUser.uid,c=await pool.getConnection(); try{ if(!positiveInt(id))return res.status(400).json({message:"Invalid product ID."}); await c.beginTransaction(); const deleted=await archiveProductTree(c,uid,id); await c.commit(); res.json({message:"Product and its related records moved to Recently Deleted.",deleted}); }catch(e){await c.rollback();throw e;}finally{c.release();} }));

app.post("/api/settings/reset-inventory", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{
 if(req.body?.confirmation!=="RESET INVENTORY")return res.status(400).json({message:"Type RESET INVENTORY to confirm this action."});
 const uid=req.firebaseUser.uid,c=await pool.getConnection();
 try{
  await c.beginTransaction();
  const [products]=await c.execute("SELECT id FROM products WHERE user_uid=? ORDER BY id FOR UPDATE",[uid]);
  const totals={products:0,stockIn:0,sales:0,damaged:0};
  for(const product of products){
   const counts=await archiveProductTree(c,uid,Number(product.id));
   totals.products+=counts.products;totals.stockIn+=counts.stockIn;totals.sales+=counts.sales;totals.damaged+=counts.damaged;
  }
  await c.commit();
  res.json({message:"Inventory moved to Recently Deleted. Restore it within 30 days.",deleted:totals});
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}));
app.get("/api/recently-deleted", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{
 const uid=req.firebaseUser.uid;
 await purgeExpiredTrash(uid);
 const [rows]=await pool.execute("SELECT id,record_type,original_record_id,original_product_id,delete_batch_id,record_data,deleted_at,expires_at FROM deleted_records WHERE user_uid=? AND source_database=? ORDER BY deleted_at DESC,id DESC",[uid,SOURCE_DATABASE]);
 const productNames=new Map();
 const [liveProducts]=await pool.execute("SELECT id,product FROM products WHERE user_uid=?",[uid]);
 for(const p of liveProducts)productNames.set(Number(p.id),p.product);
 for(const row of rows){
  const data=parseTrashData(row.record_data);
  if(row.record_type==="products")productNames.set(Number(row.original_record_id),data.product||("Product #"+row.original_record_id));
 }
 const moduleNames={products:"Products",stock_in:"Stock In",sales:"Sales",damaged_items:"Damaged Items"};
 const items=rows.map(row=>{
  const data=parseTrashData(row.record_data),type=row.record_type;
  const productName=productNames.get(Number(row.original_product_id))||("Product #"+row.original_product_id);
  const label=type==="products"?(data.product||("Product #"+row.original_record_id)):productName+" · "+(type==="stock_in"?"Stock In":type==="sales"?"Sale":"Damaged")+" #"+row.original_record_id;
  return {id:Number(row.original_record_id),type,module:moduleNames[type]||type,label,deleted_at:row.deleted_at,expires_at:row.expires_at,delete_batch_id:row.delete_batch_id};
 });
 res.json(items);
}));
app.post("/api/recently-deleted/:type/:id/restore", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{
 const type=req.params.type,id=Number(req.params.id),uid=req.firebaseUser.uid;
 if(!positiveInt(id)||!["products","stock_in","sales","damaged_items"].includes(type))return res.status(400).json({message:"Invalid deleted record."});
 const c=await pool.getConnection();
 try{
  await c.beginTransaction();
  const [trash]=await c.execute("SELECT * FROM deleted_records WHERE user_uid=? AND source_database=? AND record_type=? AND original_record_id=? AND expires_at>NOW() ORDER BY id DESC LIMIT 1 FOR UPDATE",[uid,SOURCE_DATABASE,type,id]);
  if(!trash.length)throw Object.assign(new Error("Deleted record not found or its 30-day recovery period has expired."),{status:404});
  const entry=trash[0],data=parseTrashData(entry.record_data);
  if(type==="products"){
   if(String(data.user_uid)!==uid)throw Object.assign(new Error("This product does not belong to your account."),{status:403});
   if(entry.delete_batch_id){
    const [batchRows]=await c.execute("SELECT * FROM deleted_records WHERE user_uid=? AND source_database=? AND delete_batch_id=? AND expires_at>NOW() FOR UPDATE",[uid,SOURCE_DATABASE,entry.delete_batch_id]);
    const batch=batchRows.map(row=>({entry:row,data:parseTrashData(row.record_data)}));
    const productEntry=batch.find(item=>item.entry.record_type==="products"&&Number(item.entry.original_record_id)===id);
    if(!productEntry)throw Object.assign(new Error("The original product is missing from its recovery batch."),{status:409});
    for(const item of batch){
     if(item.entry.record_type!=="products"&&!["stock_in","sales","damaged_items"].includes(item.entry.record_type))throw Object.assign(new Error("The recovery batch contains an unsupported record."),{status:400});
     if(item.entry.record_type==="products"&&String(item.data.user_uid)!==uid)throw Object.assign(new Error("The recovery batch contains a product from another account."),{status:403});
    }
    await insertDeletedSourceRow(c,"products",productEntry.data);
    for(const item of batch){
     if(item.entry.record_type!=="products")await insertDeletedSourceRow(c,item.entry.record_type,item.data);
    }
    await c.execute("DELETE FROM deleted_records WHERE user_uid=? AND source_database=? AND delete_batch_id=?",[uid,SOURCE_DATABASE,entry.delete_batch_id]);
    await c.commit();
    return res.json({message:"Product and all related records restored successfully."});
   }
  }else{
   const [products]=await c.execute("SELECT id,stock FROM products WHERE id=? AND user_uid=? FOR UPDATE",[Number(data.product_id),uid]);
   if(!products.length)throw Object.assign(new Error("Restore the related product first."),{status:409});
   if(!entry.delete_batch_id){
    const quantity=Number(data.quantity);
    if(type==="stock_in")await c.execute("UPDATE products SET stock=stock+? WHERE id=? AND user_uid=?",[quantity,data.product_id,uid]);
    else{
     if(Number(products[0].stock)<quantity)throw Object.assign(new Error("Not enough stock to restore this record safely."),{status:409});
     await c.execute("UPDATE products SET stock=stock-? WHERE id=? AND user_uid=?",[quantity,data.product_id,uid]);
    }
   }
  }
  await insertDeletedSourceRow(c,type,data);
  await c.execute("DELETE FROM deleted_records WHERE id=? AND user_uid=?",[entry.id,uid]);
  await c.commit();
  res.json({message:"Record restored successfully."});
 }catch(e){await c.rollback();throw e;}finally{c.release();}
}));
app.delete("/api/recently-deleted/:type/:id", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{
 const type=req.params.type,id=Number(req.params.id),uid=req.firebaseUser.uid;
 if(!positiveInt(id)||!["products","stock_in","sales","damaged_items"].includes(type))return res.status(400).json({message:"Invalid deleted record."});
 const [entries]=await pool.execute("SELECT id,delete_batch_id FROM deleted_records WHERE user_uid=? AND source_database=? AND record_type=? AND original_record_id=? ORDER BY id DESC LIMIT 1",[uid,SOURCE_DATABASE,type,id]);
 if(!entries.length)return res.status(404).json({message:"Deleted record not found."});
 const entry=entries[0];
 if(type==="products"&&entry.delete_batch_id){
  await pool.execute("DELETE FROM deleted_records WHERE user_uid=? AND source_database=? AND delete_batch_id=?",[uid,SOURCE_DATABASE,entry.delete_batch_id]);
 }else{
  await pool.execute("DELETE FROM deleted_records WHERE id=? AND user_uid=?",[entry.id,uid]);
 }
 res.json({message:"Record permanently deleted."});
}));
app.delete("/api/recently-deleted", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{
 const uid=req.firebaseUser.uid;
 const [result]=await pool.execute("DELETE FROM deleted_records WHERE user_uid=? AND source_database=?",[uid,SOURCE_DATABASE]);
 res.json({message:"Trash permanently emptied.",deleted:result.affectedRows});
}));

app.get("/api/stock-in", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{ const [rows]=await pool.execute("SELECT s.id,p.product,s.quantity,s.unit_cost,s.total_cost,s.date,s.note FROM stock_in s JOIN products p ON p.id=s.product_id WHERE p.user_uid=? ORDER BY s.date DESC,s.id DESC",[req.firebaseUser.uid]); res.json(rows.map(stockDto)); }));
app.post("/api/stock-in", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{ const b=req.body;if(!positiveInt(b.quantity))return res.status(400).json({message:"Quantity must be a positive whole number."});const c=await pool.getConnection();try{await c.beginTransaction();const p=await productBy(c,b.product,true,req.firebaseUser.uid);if(!p)throw Object.assign(new Error("Product not found."),{status:404});await c.execute("UPDATE products SET stock=stock+? WHERE id=?",[Number(b.quantity),p.id]);const [r]=await c.execute("INSERT INTO stock_in(product_id,quantity,unit_cost,total_cost,date,note) VALUES(?,?,?,?,?,?)",[p.id,Number(b.quantity),Number(p.buy),Number(p.buy)*Number(b.quantity),dateValue(b.date),b.note||""]);await c.commit();res.status(201).json({id:r.insertId,product:p.product,quantity:String(b.quantity),date:dateValue(b.date),note:b.note||""});}catch(e){await c.rollback();throw e;}finally{c.release();} }));
app.put("/api/stock-in/:id", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{const id=Number(req.params.id),b=req.body;if(!positiveInt(id)||!positiveInt(b.quantity))return res.status(400).json({message:"Invalid stock-in details."});const c=await pool.getConnection();try{await c.beginTransaction();const [oldRows]=await c.execute("SELECT s.* FROM stock_in s JOIN products p ON p.id=s.product_id WHERE s.id=? AND p.user_uid=? FOR UPDATE",[id,req.firebaseUser.uid]);if(!oldRows.length)throw Object.assign(new Error("Stock-in record not found."),{status:404});const old=oldRows[0],p=await productBy(c,b.product,true,req.firebaseUser.uid);if(!p)throw Object.assign(new Error("Product not found."),{status:404});const [oldProduct]=await c.execute("SELECT stock FROM products WHERE id=? FOR UPDATE",[old.product_id]);if(!oldProduct.length||Number(oldProduct[0].stock)<Number(old.quantity))throw Object.assign(new Error("Cannot revise this stock-in record because some units have already been used."),{status:409});await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[old.quantity,old.product_id]);await c.execute("UPDATE products SET stock=stock+? WHERE id=?",[Number(b.quantity),p.id]);await c.execute("UPDATE stock_in SET product_id=?,quantity=?,unit_cost=?,total_cost=?,date=?,note=? WHERE id=?",[p.id,Number(b.quantity),Number(p.buy),Number(p.buy)*Number(b.quantity),dateValue(b.date),b.note||"",id]);await c.commit();res.json({id,product:p.product,quantity:String(b.quantity),date:dateValue(b.date),note:b.note||""});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.delete("/api/stock-in/:id", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{const id=Number(req.params.id),uid=req.firebaseUser.uid,c=await pool.getConnection();try{if(!positiveInt(id))return res.status(400).json({message:"Invalid stock-in ID."});await c.beginTransaction();await archiveTransaction(c,uid,"stock_in",id);await c.commit();res.json({message:"Stock-in record moved to Recently Deleted."});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.get("/api/sales", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{const [rows]=await pool.execute("SELECT s.id,p.product,s.quantity,s.date,s.amount,s.unit_cost,s.profit,s.note FROM sales s JOIN products p ON p.id=s.product_id WHERE p.user_uid=? ORDER BY s.date DESC,s.id DESC",[req.firebaseUser.uid]);res.json(rows.map(saleDto));}));
async function saveSale(c,b,old,uid){const p=await productBy(c,b.product,true,uid);if(!p)throw Object.assign(new Error("Product not found in inventory."),{status:404});const q=Number(b.quantity);if(!Number.isInteger(q)||q<=0)throw Object.assign(new Error("Quantity must be a positive whole number."),{status:400});const [locked]=await c.execute("SELECT stock FROM products WHERE id=? FOR UPDATE",[p.id]);const available=Number(locked[0].stock)+(old&&old.product_id===p.id?Number(old.quantity):0);if(q>available)throw Object.assign(new Error("INSUFFICIENT STOCK: Only "+available+" unit(s) are available."),{status:400});const cost=Number(p.buy),price=Number(p.sell);if(!Number.isFinite(cost)||cost<0||!Number.isFinite(price)||price<=0)throw Object.assign(new Error("Product cost or selling price is invalid."),{status:400});if(price<cost)throw Object.assign(new Error("LOSS PREVENTED: Selling price is below the product cost."),{status:400});const amount=price*q,profit=(price-cost)*q;if(old){await c.execute("UPDATE products SET stock=stock+? WHERE id=?",[old.quantity,old.product_id]);await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[q,p.id]);await c.execute("UPDATE sales SET product_id=?,quantity=?,date=?,amount=?,unit_cost=?,profit=?,note=? WHERE id=?",[p.id,q,dateValue(b.date),amount,cost,profit,b.note||"",old.id]);return{id:old.id,product:p.product,quantity:String(q),date:dateValue(b.date),amount:String(amount),unitCost:cost,profit,note:b.note||""};}await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[q,p.id]);const [r]=await c.execute("INSERT INTO sales(product_id,quantity,date,amount,unit_cost,profit,note) VALUES(?,?,?,?,?,?,?)",[p.id,q,dateValue(b.date),amount,cost,profit,b.note||""]);return{id:r.insertId,product:p.product,quantity:String(q),date:dateValue(b.date),amount:String(amount),unitCost:cost,profit,note:b.note||""};}
app.post("/api/sales", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{const c=await pool.getConnection();try{await c.beginTransaction();const sale=await saveSale(c,req.body,null,req.firebaseUser.uid);await c.commit();res.status(201).json(sale);}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.put("/api/sales/:id", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{const c=await pool.getConnection();try{await c.beginTransaction();const [rows]=await c.execute("SELECT s.* FROM sales s JOIN products p ON p.id=s.product_id WHERE s.id=? AND p.user_uid=? FOR UPDATE",[Number(req.params.id),req.firebaseUser.uid]);if(!rows.length)throw Object.assign(new Error("Sale not found."),{status:404});const sale=await saveSale(c,req.body,rows[0],req.firebaseUser.uid);await c.commit();res.json(sale);}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.delete("/api/sales/:id", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{const id=Number(req.params.id),uid=req.firebaseUser.uid,c=await pool.getConnection();try{if(!positiveInt(id))return res.status(400).json({message:"Invalid sale ID."});await c.beginTransaction();await archiveTransaction(c,uid,"sales",id);await c.commit();res.json({message:"Sale moved to Recently Deleted."});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.get("/api/damaged", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{const [rows]=await pool.execute("SELECT d.id,p.product,d.quantity,d.date,d.unit_cost,d.total_loss,d.reason FROM damaged_items d JOIN products p ON p.id=d.product_id WHERE p.user_uid=? ORDER BY d.date DESC,d.id DESC",[req.firebaseUser.uid]);res.json(rows.map(damagedDto));}));
app.post("/api/damaged", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{const b=req.body;if(!positiveInt(b.quantity))return res.status(400).json({message:"Quantity must be a positive whole number."});const c=await pool.getConnection();try{await c.beginTransaction();const p=await productBy(c,b.product,true,req.firebaseUser.uid);if(!p)throw Object.assign(new Error("Product not found."),{status:404});if(Number(p.stock)<Number(b.quantity))throw Object.assign(new Error("Insufficient stock for damaged quantity."),{status:400});await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[Number(b.quantity),p.id]);const unitCost=Number(p.buy),totalLoss=unitCost*Number(b.quantity);const [r]=await c.execute("INSERT INTO damaged_items(product_id,quantity,date,unit_cost,total_loss,reason) VALUES(?,?,?,?,?,?)",[p.id,Number(b.quantity),dateValue(b.date),unitCost,totalLoss,b.reason||""]);await c.commit();res.status(201).json({id:r.insertId,product:p.product,quantity:String(b.quantity),date:dateValue(b.date),unitCost:String(unitCost),loss:String(totalLoss),reason:b.reason||""});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.put("/api/damaged/:id", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{const id=Number(req.params.id),b=req.body;if(!positiveInt(id)||!positiveInt(b.quantity))return res.status(400).json({message:"Invalid damaged-item details."});const c=await pool.getConnection();try{await c.beginTransaction();const [rows]=await c.execute("SELECT d.* FROM damaged_items d JOIN products p ON p.id=d.product_id WHERE d.id=? AND p.user_uid=? FOR UPDATE",[id,req.firebaseUser.uid]);if(!rows.length)throw Object.assign(new Error("Damaged item not found."),{status:404});const old=rows[0],p=await productBy(c,b.product,true,req.firebaseUser.uid);if(!p)throw Object.assign(new Error("Product not found."),{status:404});await c.execute("UPDATE products SET stock=stock+? WHERE id=?",[old.quantity,old.product_id]);const [stockRows]=await c.execute("SELECT stock FROM products WHERE id=? FOR UPDATE",[p.id]);if(Number(stockRows[0].stock)<Number(b.quantity))throw Object.assign(new Error("Insufficient stock for this update."),{status:400});await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[Number(b.quantity),p.id]);const unitCost=Number(p.buy),totalLoss=unitCost*Number(b.quantity);await c.execute("UPDATE damaged_items SET product_id=?,quantity=?,date=?,unit_cost=?,total_loss=?,reason=? WHERE id=?",[p.id,Number(b.quantity),dateValue(b.date),unitCost,totalLoss,b.reason||"",id]);await c.commit();res.json({id,product:p.product,quantity:String(b.quantity),date:dateValue(b.date),unitCost:String(unitCost),loss:String(totalLoss),reason:b.reason||""});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.delete("/api/damaged/:id", requireFirebaseUser, requireActiveUser, route(async(req,res)=>{const id=Number(req.params.id),uid=req.firebaseUser.uid,c=await pool.getConnection();try{if(!positiveInt(id))return res.status(400).json({message:"Invalid damaged-item ID."});await c.beginTransaction();await archiveTransaction(c,uid,"damaged_items",id);await c.commit();res.json({message:"Damaged-item record moved to Recently Deleted."});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.get("/api/settings/:uid", requireFirebaseUser, requireActiveUser, route(async (req,res) => {
 const uid=req.firebaseUser.uid;
 if(!uid || uid.length>128) return res.status(400).json({message:"A valid account ID is required."});
 const [rows]=await pool.execute("SELECT store_name,owner_name,currency_symbol FROM store_settings WHERE user_uid=? LIMIT 1",[uid]);
 res.json(rows[0] ? {storeName:rows[0].store_name,ownerName:rows[0].owner_name,currency:rows[0].currency_symbol} : {storeName:"Hardware Store",ownerName:"",currency:"₱"});
}));
app.put("/api/settings/:uid", requireFirebaseUser, requireActiveUser, route(async (req,res) => {
 const uid=req.firebaseUser.uid, b=req.body||{};
 const storeName=String(b.storeName||"").trim(), ownerName=String(b.ownerName||"").trim(), currency=String(b.currency||"").trim();
 if(!uid || uid.length>128 || !storeName || storeName.length>150 || !ownerName || ownerName.length>150 || !currency || currency.length>3) return res.status(400).json({message:"Enter a store name, owner name, and currency symbol (maximum 3 characters)."});
 await pool.execute("INSERT INTO store_settings (user_uid,store_name,owner_name,currency_symbol) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE store_name=VALUES(store_name),owner_name=VALUES(owner_name),currency_symbol=VALUES(currency_symbol)",[uid,storeName,ownerName,currency]);
 res.json({message:"Store settings saved successfully.",settings:{storeName,ownerName,currency}});
}));

// --- Firebase-authenticated user directory and activity analytics ---
let firebaseAdminApp = null;
try {
 const admin = require("firebase-admin");
 const serviceAccountText = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
 const credentialPathSetting = process.env.GOOGLE_APPLICATION_CREDENTIALS;

 if (serviceAccountText) {
  const serviceAccount = JSON.parse(serviceAccountText);
  firebaseAdminApp = admin.apps.length ? admin.app() : admin.initializeApp({
   credential: admin.credential.cert(serviceAccount)
  });
 } else if (credentialPathSetting) {
  // Resolve relative paths from this backend folder, not the shell's working directory.
  const credentialPath = path.isAbsolute(credentialPathSetting)
   ? credentialPathSetting
   : path.resolve(__dirname, credentialPathSetting);
  if (!fs.existsSync(credentialPath)) {
   throw new Error("Firebase service-account file not found at " + credentialPath);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(credentialPath, "utf8"));
  firebaseAdminApp = admin.apps.length ? admin.app() : admin.initializeApp({
   credential: admin.credential.cert(serviceAccount)
  });
 } else {
  console.warn("[FIREBASE] Admin credentials are not configured. Account verification will return HTTP 503.");
 }
 console.log("[FIREBASE] Admin authentication", firebaseAdminApp ? "ready" : "not configured");
} catch (error) {
 console.error("[FIREBASE] Admin initialization failed:", error.message);
}
async function requireFirebaseUser(req,res,next) {
 const startedAt = Date.now();
 let timeoutId;
 try {
  if (!firebaseAdminApp) {
   return res.status(503).json({message:"Firebase Admin is not configured. Set GOOGLE_APPLICATION_CREDENTIALS to the service-account JSON file in the backend folder."});
  }
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) return res.status(401).json({message:"Firebase sign-in is required."});
  console.log("[AUTH] Verifying Firebase ID token for", req.method, req.path);
  const verificationTimeout = new Promise((resolve, reject) => {
   timeoutId = setTimeout(() => {
    const error = new Error("Firebase token verification timed out after 10 seconds.");
    error.status = 503;
    reject(error);
   }, 10000);
  });
  req.firebaseUser = await Promise.race([
   firebaseAdminApp.auth().verifyIdToken(header.slice(7)),
   verificationTimeout
  ]);
  console.log("[AUTH] Firebase token verified in", Date.now() - startedAt + "ms");
  return next();
 } catch (error) {
  console.error("[AUTH] Firebase token verification failed after", Date.now() - startedAt + "ms", error.message);
  if (error.status === 503) {
   return res.status(503).json({message:"Firebase verification is taking too long. Check the backend internet connection and Firebase service-account configuration."});
  }
  return res.status(401).json({message:"Your session is invalid or expired. Please sign in again."});
 } finally {
  if (timeoutId) clearTimeout(timeoutId);
 }
}
async function requireActiveUser(req,res,next) {
 try {
  const [rows] = await pool.execute("SELECT role,status FROM app_users WHERE firebase_uid=? LIMIT 1",[req.firebaseUser.uid]);
  if (!rows.length || rows[0].status !== "active") return res.status(403).json({message:"Your account is not active. Contact the administrator."});
  req.databaseRole = rows[0].role;
  next();
 } catch (error) { next(error); }
}
async function requireDatabaseAdmin(req,res,next) {
 try {
  const [rows] = await pool.execute("SELECT role,status FROM app_users WHERE firebase_uid=? LIMIT 1",[req.firebaseUser.uid]);
  if (!rows.length || !["admin","superadmin"].includes(rows[0].role) || rows[0].status !== "active") return res.status(403).json({message:"Administrator access is required."});
  req.databaseRole = rows[0].role;
  next();
 } catch (error) { next(error); }
}
app.post("/api/auth/sync", requireFirebaseUser, route(async(req,res) => {
 const startedAt = Date.now();
 const u=req.firebaseUser;
 const displayName=String(u.name || u.email || "User").slice(0,150);
 const email=String(u.email || "").slice(0,190);
 console.log("[SYNC] Starting MySQL account sync");
 await pool.execute(
  "INSERT INTO app_users(firebase_uid,display_name,email,photo_url,role,status,last_seen_at) VALUES(?,?,?,?, 'user','active',NOW()) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),email=VALUES(email),photo_url=VALUES(photo_url),last_seen_at=NOW()",
  [u.uid,displayName,email,u.picture || null]
 );
 console.log("[SYNC] app_users upsert completed in", Date.now() - startedAt + "ms");
 await pool.execute("INSERT INTO activity_logs(firebase_uid,event_type,created_at) VALUES(?,'session_sync',NOW())",[u.uid]);
 console.log("[SYNC] activity log insert completed in", Date.now() - startedAt + "ms");
 const [accountRows] = await pool.execute("SELECT role,status FROM app_users WHERE firebase_uid=? LIMIT 1",[u.uid]);
 const account = accountRows[0];
 console.log("[SYNC] Completed in", Date.now() - startedAt + "ms");
 res.json({message:"Account synchronized with the inventory database.",role:account?.role || "user",status:account?.status || "active"});
}));
app.post("/api/activity/heartbeat", requireFirebaseUser, route(async(req,res) => {
 const u=req.firebaseUser;
 await pool.execute("UPDATE app_users SET last_seen_at=NOW() WHERE firebase_uid=?",[u.uid]);
 await pool.execute("INSERT INTO activity_logs(firebase_uid,event_type,created_at) VALUES(?,'heartbeat',NOW())",[u.uid]);
 res.status(204).end();
}));
app.get("/api/admin/users", requireFirebaseUser, requireDatabaseAdmin, route(async(req,res) => {
 const [rows]=await pool.query("SELECT firebase_uid AS id,display_name AS displayName,email,photo_url AS photoURL,role,status,last_seen_at AS lastSeenAt,created_at AS createdAt FROM app_users ORDER BY created_at DESC");
 res.json(rows);
}));
app.get("/api/admin/overview", requireFirebaseUser, requireDatabaseAdmin, route(async(req,res) => {
 const period=["day","week","month"].includes(req.query.period) ? req.query.period : "month";
 const interval=period==="day" ? 1 : period==="week" ? 7 : 30;
 const [counts]=await pool.query("SELECT COUNT(*) AS totalUsers,SUM(status='active') AS activeUsers,SUM(role IN ('admin','superadmin')) AS totalAdmins,SUM(created_at >= DATE_SUB(NOW(),INTERVAL 30 DAY)) AS newUsers FROM app_users");
 const [activity]=await pool.execute("SELECT DATE_FORMAT(created_at,'%Y-%m-%d %H:%i:00') AS bucket,COUNT(DISTINCT firebase_uid) AS users FROM activity_logs WHERE created_at >= DATE_SUB(NOW(),INTERVAL 30 MINUTE) GROUP BY bucket ORDER BY bucket",[ ]);
 const [trend]=await pool.execute("SELECT DATE(created_at) AS day,COUNT(*) AS count FROM app_users WHERE created_at >= DATE_SUB(CURDATE(),INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY day",[interval]);
 res.json({period,summary:counts[0],realtime:activity.map(x=>({label:x.bucket,users:Number(x.users)})),newUsersTrend:trend.map(x=>({label:x.day,count:Number(x.count)}))});
}));

app.use((error,req,res,next)=>{console.error(error);if(res.headersSent)return next(error);res.status(error.status||500).json({message:error.status?error.message:"Server or database error. Check backend logs and database connection."});});
// Bind the HTTP port immediately so Render can detect the service and wake it.
const server = app.listen(PORT, () => {
 console.log("Hardware Inventory API listening on port " + PORT);
 console.log("[STARTUP] Firebase Admin:", firebaseAdminApp ? "configured" : "NOT CONFIGURED");
});

// Check MySQL in the background. A temporary database outage must not prevent
// the web server from starting; /api/health reports when all dependencies are ready.
async function checkDatabaseAtStartup() {
 try {
  await pool.query("SELECT 1");
  console.log("[STARTUP] MySQL connected:", process.env.DB_NAME || "hardware_inventory_v2");
 } catch (error) {
  console.error("[STARTUP] MySQL is not ready yet:", error.message);
  console.error("[STARTUP] The API remains online and /api/health will report when the database is ready.");
 }
}
checkDatabaseAtStartup();
const trashCleanupTimer=setInterval(async()=>{try{await purgeExpiredTrash();console.log("[TRASH] Expired records cleanup completed.");}catch(error){console.warn("[TRASH] Scheduled cleanup skipped:",error.message);}},24*60*60*1000);
if(typeof trashCleanupTimer.unref==="function")trashCleanupTimer.unref();


process.on("SIGTERM", () => {
 console.log("[SHUTDOWN] SIGTERM received.");
 server.close(() => {
  pool.end().finally(() => process.exit(0));
 });
});