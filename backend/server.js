require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = Number(process.env.PORT || 8080);
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",").map(x => x.trim()) : true }));
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
 ssl: databaseSsl
});
const route = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const positiveInt = v => Number.isInteger(Number(v)) && Number(v) > 0;
const dateValue = v => v || new Date().toISOString().slice(0, 10);
async function productBy(connection, value, lock = false) {
 const sql = "SELECT * FROM products WHERE id=? OR LOWER(product)=LOWER(?) LIMIT 1" + (lock ? " FOR UPDATE" : "");
 const [rows] = await connection.execute(sql, [Number(value) || -1, String(value || "")]); return rows[0] || null;
}
const productDto = r => ({ id:r.id, product:r.product, category:r.category, buy:String(r.buy), sell:String(r.sell), stock:String(r.stock) });
const stockDto = r => ({ id:r.id, product:r.product, quantity:String(r.quantity), date:r.date, note:r.note || "" });
const saleDto = r => ({ id:r.id, product:r.product, quantity:String(r.quantity), date:r.date, amount:String(r.amount), unitCost:Number(r.unit_cost), profit:Number(r.profit), note:r.note || "" });
const damagedDto = r => ({ id:r.id, product:r.product, quantity:String(r.quantity), date:r.date, reason:r.reason || "" });
app.get("/api/health", route(async (req,res) => { await pool.query("SELECT 1"); res.json({status:"ok",database:"connected"}); }));
app.get("/api/product", route(async (req,res) => { const [rows]=await pool.query("SELECT * FROM products ORDER BY id DESC"); res.json(rows.map(productDto)); }));
app.post("/api/product", route(async (req,res) => {
 const b=req.body; if(!String(b.product||"").trim()||!String(b.category||"").trim()||!Number.isFinite(Number(b.buy))||Number(b.buy)<0||!Number.isFinite(Number(b.sell))||Number(b.sell)<0||!Number.isInteger(Number(b.stock??0))||Number(b.stock??0)<0) return res.status(400).json({message:"Enter valid product details and non-negative whole-number stock."});
 const [r]=await pool.execute("INSERT INTO products(product,category,buy,sell,stock) VALUES(?,?,?,?,?)",[b.product.trim(),b.category.trim(),Number(b.buy),Number(b.sell),Number(b.stock??0)]);
 const [rows]=await pool.execute("SELECT * FROM products WHERE id=?",[r.insertId]); res.status(201).json(productDto(rows[0]));
}));
app.put("/api/product/:id", route(async(req,res)=>{ const b=req.body,id=Number(req.params.id); if(!Number.isInteger(id)||id<1||!String(b.product||"").trim()||!String(b.category||"").trim()||!Number.isFinite(Number(b.buy))||Number(b.buy)<0||!Number.isFinite(Number(b.sell))||Number(b.sell)<0||!Number.isInteger(Number(b.stock))||Number(b.stock)<0) return res.status(400).json({message:"Invalid product details."}); const [r]=await pool.execute("UPDATE products SET product=?,category=?,buy=?,sell=?,stock=? WHERE id=?",[b.product.trim(),b.category.trim(),Number(b.buy),Number(b.sell),Number(b.stock),id]); if(!r.affectedRows)return res.status(404).json({message:"Product not found."}); const [rows]=await pool.execute("SELECT * FROM products WHERE id=?",[id]); res.json(productDto(rows[0])); }));
app.delete("/api/product/:id", route(async(req,res)=>{ const [r]=await pool.execute("DELETE FROM products WHERE id=?",[Number(req.params.id)]); if(!r.affectedRows)return res.status(404).json({message:"Product not found."}); res.json({message:"Product deleted successfully."}); }));
app.get("/api/stock-in", route(async(req,res)=>{ const [rows]=await pool.query("SELECT s.id,p.product,s.quantity,s.date,s.note FROM stock_in s JOIN products p ON p.id=s.product_id ORDER BY s.date DESC,s.id DESC"); res.json(rows.map(stockDto)); }));
app.post("/api/stock-in", route(async(req,res)=>{ const b=req.body;if(!positiveInt(b.quantity))return res.status(400).json({message:"Quantity must be a positive whole number."});const c=await pool.getConnection();try{await c.beginTransaction();const p=await productBy(c,b.product,true);if(!p)throw Object.assign(new Error("Product not found."),{status:404});await c.execute("UPDATE products SET stock=stock+? WHERE id=?",[Number(b.quantity),p.id]);const [r]=await c.execute("INSERT INTO stock_in(product_id,quantity,unit_cost,total_cost,date,note) VALUES(?,?,?,?,?,?)",[p.id,Number(b.quantity),Number(p.buy),Number(p.buy)*Number(b.quantity),dateValue(b.date),b.note||""]);await c.commit();res.status(201).json({id:r.insertId,product:p.product,quantity:String(b.quantity),date:dateValue(b.date),note:b.note||""});}catch(e){await c.rollback();throw e;}finally{c.release();} }));
app.put("/api/stock-in/:id", route(async(req,res)=>{const id=Number(req.params.id),b=req.body;if(!positiveInt(id)||!positiveInt(b.quantity))return res.status(400).json({message:"Invalid stock-in details."});const c=await pool.getConnection();try{await c.beginTransaction();const [oldRows]=await c.execute("SELECT * FROM stock_in WHERE id=? FOR UPDATE",[id]);if(!oldRows.length)throw Object.assign(new Error("Stock-in record not found."),{status:404});const old=oldRows[0],p=await productBy(c,b.product,true);if(!p)throw Object.assign(new Error("Product not found."),{status:404});const [oldProduct]=await c.execute("SELECT stock FROM products WHERE id=? FOR UPDATE",[old.product_id]);if(!oldProduct.length||Number(oldProduct[0].stock)<Number(old.quantity))throw Object.assign(new Error("Cannot revise this stock-in record because some units have already been used."),{status:409});await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[old.quantity,old.product_id]);await c.execute("UPDATE products SET stock=stock+? WHERE id=?",[Number(b.quantity),p.id]);await c.execute("UPDATE stock_in SET product_id=?,quantity=?,unit_cost=?,total_cost=?,date=?,note=? WHERE id=?",[p.id,Number(b.quantity),Number(p.buy),Number(p.buy)*Number(b.quantity),dateValue(b.date),b.note||"",id]);await c.commit();res.json({id,product:p.product,quantity:String(b.quantity),date:dateValue(b.date),note:b.note||""});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.delete("/api/stock-in/:id", route(async(req,res)=>{const c=await pool.getConnection();try{await c.beginTransaction();const [rows]=await c.execute("SELECT * FROM stock_in WHERE id=? FOR UPDATE",[Number(req.params.id)]);if(!rows.length)throw Object.assign(new Error("Stock-in record not found."),{status:404});const x=rows[0],[p]=await c.execute("SELECT stock FROM products WHERE id=? FOR UPDATE",[x.product_id]);if(!p.length||Number(p[0].stock)<Number(x.quantity))throw Object.assign(new Error("Cannot delete: some received units have already been used."),{status:409});await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[x.quantity,x.product_id]);await c.execute("DELETE FROM stock_in WHERE id=?",[x.id]);await c.commit();res.json({message:"Stock-in record deleted."});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.get("/api/sales", route(async(req,res)=>{const [rows]=await pool.query("SELECT s.id,p.product,s.quantity,s.date,s.amount,s.unit_cost,s.profit,s.note FROM sales s JOIN products p ON p.id=s.product_id ORDER BY s.date DESC,s.id DESC");res.json(rows.map(saleDto));}));
async function saveSale(c,b,old){const p=await productBy(c,b.product,true);if(!p)throw Object.assign(new Error("Product not found in inventory."),{status:404});const q=Number(b.quantity);if(!Number.isInteger(q)||q<=0)throw Object.assign(new Error("Quantity must be a positive whole number."),{status:400});const [locked]=await c.execute("SELECT stock FROM products WHERE id=? FOR UPDATE",[p.id]);const available=Number(locked[0].stock)+(old&&old.product_id===p.id?Number(old.quantity):0);if(q>available)throw Object.assign(new Error("INSUFFICIENT STOCK: Only "+available+" unit(s) are available."),{status:400});const cost=Number(p.buy),price=Number(p.sell);if(!Number.isFinite(cost)||cost<0||!Number.isFinite(price)||price<=0)throw Object.assign(new Error("Product cost or selling price is invalid."),{status:400});if(price<cost)throw Object.assign(new Error("LOSS PREVENTED: Selling price is below the product cost."),{status:400});const amount=price*q,profit=(price-cost)*q;if(old){await c.execute("UPDATE products SET stock=stock+? WHERE id=?",[old.quantity,old.product_id]);await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[q,p.id]);await c.execute("UPDATE sales SET product_id=?,quantity=?,date=?,amount=?,unit_cost=?,profit=?,note=? WHERE id=?",[p.id,q,dateValue(b.date),amount,cost,profit,b.note||"",old.id]);return{id:old.id,product:p.product,quantity:String(q),date:dateValue(b.date),amount:String(amount),unitCost:cost,profit,note:b.note||""};}await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[q,p.id]);const [r]=await c.execute("INSERT INTO sales(product_id,quantity,date,amount,unit_cost,profit,note) VALUES(?,?,?,?,?,?,?)",[p.id,q,dateValue(b.date),amount,cost,profit,b.note||""]);return{id:r.insertId,product:p.product,quantity:String(q),date:dateValue(b.date),amount:String(amount),unitCost:cost,profit,note:b.note||""};}
app.post("/api/sales", route(async(req,res)=>{const c=await pool.getConnection();try{await c.beginTransaction();const sale=await saveSale(c,req.body,null);await c.commit();res.status(201).json(sale);}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.put("/api/sales/:id", route(async(req,res)=>{const c=await pool.getConnection();try{await c.beginTransaction();const [rows]=await c.execute("SELECT * FROM sales WHERE id=? FOR UPDATE",[Number(req.params.id)]);if(!rows.length)throw Object.assign(new Error("Sale not found."),{status:404});const sale=await saveSale(c,req.body,rows[0]);await c.commit();res.json(sale);}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.delete("/api/sales/:id", route(async(req,res)=>{const c=await pool.getConnection();try{await c.beginTransaction();const [rows]=await c.execute("SELECT * FROM sales WHERE id=? FOR UPDATE",[Number(req.params.id)]);if(!rows.length)throw Object.assign(new Error("Sale not found."),{status:404});const s=rows[0];await c.execute("UPDATE products SET stock=stock+? WHERE id=?",[s.quantity,s.product_id]);await c.execute("DELETE FROM sales WHERE id=?",[s.id]);await c.commit();res.json({message:"Sale deleted successfully."});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.get("/api/damaged", route(async(req,res)=>{const [rows]=await pool.query("SELECT d.id,p.product,d.quantity,d.date,d.reason FROM damaged_items d JOIN products p ON p.id=d.product_id ORDER BY d.date DESC,d.id DESC");res.json(rows.map(damagedDto));}));
app.post("/api/damaged", route(async(req,res)=>{const b=req.body;if(!positiveInt(b.quantity))return res.status(400).json({message:"Quantity must be a positive whole number."});const c=await pool.getConnection();try{await c.beginTransaction();const p=await productBy(c,b.product,true);if(!p)throw Object.assign(new Error("Product not found."),{status:404});if(Number(p.stock)<Number(b.quantity))throw Object.assign(new Error("Insufficient stock for damaged quantity."),{status:400});await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[Number(b.quantity),p.id]);const [r]=await c.execute("INSERT INTO damaged_items(product_id,quantity,date,reason) VALUES(?,?,?,?)",[p.id,Number(b.quantity),dateValue(b.date),b.reason||""]);await c.commit();res.status(201).json({id:r.insertId,product:p.product,quantity:String(b.quantity),date:dateValue(b.date),reason:b.reason||""});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.put("/api/damaged/:id", route(async(req,res)=>{const id=Number(req.params.id),b=req.body;if(!positiveInt(id)||!positiveInt(b.quantity))return res.status(400).json({message:"Invalid damaged-item details."});const c=await pool.getConnection();try{await c.beginTransaction();const [rows]=await c.execute("SELECT * FROM damaged_items WHERE id=? FOR UPDATE",[id]);if(!rows.length)throw Object.assign(new Error("Damaged item not found."),{status:404});const old=rows[0],p=await productBy(c,b.product,true);if(!p)throw Object.assign(new Error("Product not found."),{status:404});await c.execute("UPDATE products SET stock=stock+? WHERE id=?",[old.quantity,old.product_id]);const [stockRows]=await c.execute("SELECT stock FROM products WHERE id=? FOR UPDATE",[p.id]);if(Number(stockRows[0].stock)<Number(b.quantity))throw Object.assign(new Error("Insufficient stock for this update."),{status:400});await c.execute("UPDATE products SET stock=stock-? WHERE id=?",[Number(b.quantity),p.id]);await c.execute("UPDATE damaged_items SET product_id=?,quantity=?,date=?,reason=? WHERE id=?",[p.id,Number(b.quantity),dateValue(b.date),b.reason||"",id]);await c.commit();res.json({id,product:p.product,quantity:String(b.quantity),date:dateValue(b.date),reason:b.reason||""});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.delete("/api/damaged/:id", route(async(req,res)=>{const c=await pool.getConnection();try{await c.beginTransaction();const [rows]=await c.execute("SELECT * FROM damaged_items WHERE id=? FOR UPDATE",[Number(req.params.id)]);if(!rows.length)throw Object.assign(new Error("Damaged item not found."),{status:404});const d=rows[0];await c.execute("UPDATE products SET stock=stock+? WHERE id=?",[d.quantity,d.product_id]);await c.execute("DELETE FROM damaged_items WHERE id=?",[d.id]);await c.commit();res.json({message:"Damaged-item record deleted."});}catch(e){await c.rollback();throw e;}finally{c.release();}}));
app.get("/api/settings/:uid", route(async (req,res) => {
 const uid=String(req.params.uid||"").trim();
 if(!uid || uid.length>128) return res.status(400).json({message:"A valid account ID is required."});
 const [rows]=await pool.execute("SELECT store_name,owner_name,currency_symbol FROM store_settings WHERE user_uid=? LIMIT 1",[uid]);
 res.json(rows[0] ? {storeName:rows[0].store_name,ownerName:rows[0].owner_name,currency:rows[0].currency_symbol} : {storeName:"Hardware Store",ownerName:"",currency:"₱"});
}));
app.put("/api/settings/:uid", route(async (req,res) => {
 const uid=String(req.params.uid||"").trim(), b=req.body||{};
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
 if (serviceAccountText) {
  const serviceAccount = JSON.parse(serviceAccountText);
  firebaseAdminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
 } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  firebaseAdminApp = admin.initializeApp({ credential: admin.credential.applicationDefault() });
 }
} catch (error) {
 console.error("Firebase Admin initialization failed:", error.message);
}
async function requireFirebaseUser(req,res,next) {
 try {
  if (!firebaseAdminApp) return res.status(503).json({message:"Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON on the backend."});
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) return res.status(401).json({message:"Firebase sign-in is required."});
  req.firebaseUser = await firebaseAdminApp.auth().verifyIdToken(header.slice(7));
  next();
 } catch (error) { return res.status(401).json({message:"Your session is invalid or expired. Please sign in again."}); }
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
 const u=req.firebaseUser;
 const displayName=String(u.name || u.email || "User").slice(0,150);
 const email=String(u.email || "").slice(0,190);
 await pool.execute(
  "INSERT INTO app_users(firebase_uid,display_name,email,photo_url,role,status,last_seen_at) VALUES(?,?,?,?, 'user','active',NOW()) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name),email=VALUES(email),photo_url=VALUES(photo_url),last_seen_at=NOW()",
  [u.uid,displayName,email,u.picture || null]
 );
 await pool.execute("INSERT INTO activity_logs(firebase_uid,event_type,created_at) VALUES(?,'session_sync',NOW())",[u.uid]);
 res.json({message:"Account synchronized with the inventory database."});
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
async function start(){try{await pool.query("SELECT 1");app.listen(PORT,()=>console.log("Hardware Inventory API running on port "+PORT+"; database connected."));}catch(error){console.error("Database connection failed:",error.message);process.exit(1);}}
start();