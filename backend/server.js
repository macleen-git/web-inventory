const express = require("express");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());


// =========================
// PRODUCTS / INVENTORY
// =========================

let products = [
    {
        id: 1,
        product: "Claw Hammer",
        category: "Hand Tools",
        buy: "250",
        sell: "350",
        stock: "10"
    },
    {
        id: 2,
        product: "Screwdriver",
        category: "Hand Tools",
        buy: "100",
        sell: "150",
        stock: "20"
    },
    {
        id: 3,
        product: "Adjustable Wrench",
        category: "Hand Tools",
        buy: "180",
        sell: "250",
        stock: "8"
    },
    {
        id: 4,
        product: "Power Drill",
        category: "Power Tools",
        buy: "1200",
        sell: "1500",
        stock: "5"
    }
];

let nextID = 5;


// GET PRODUCTS
app.get("/api/product", (req, res) => {
    res.json(products);
});


// ADD PRODUCT
app.post("/api/product", (req, res) => {

    const newProduct = {
        id: nextID,
        product: req.body.product,
        category: req.body.category,
        buy: req.body.buy,
        sell: req.body.sell,
        stock: req.body.stock
    };

    nextID++;

    products.push(newProduct);

    console.log("Added product:", newProduct);

    res.status(201).json(newProduct);
});


// UPDATE PRODUCT
app.put("/api/product/:id", (req, res) => {

    const id = Number(req.params.id);

    const editID = products.findIndex(
        (item) => item.id === id
    );

    if (editID === -1) {
        return res.status(404).json({
            message: "Product not found"
        });
    }

    products[editID] = {
        id: id,
        product: req.body.product,
        category: req.body.category,
        buy: req.body.buy,
        sell: req.body.sell,
        stock: req.body.stock
    };

    console.log("Updated product:", products[editID]);

    res.json(products[editID]);
});


// DELETE PRODUCT
app.delete("/api/product/:id", (req, res) => {

    const id = Number(req.params.id);

    const deleteID = products.findIndex(
        (item) => item.id === id
    );

    if (deleteID === -1) {
        return res.status(404).json({
            message: "Product not found"
        });
    }

    const deletedProduct = products[deleteID];

    products.splice(deleteID, 1);

    console.log("Deleted product:", deletedProduct);

    res.json({
        message: "Product deleted successfully",
        product: deletedProduct
    });
});


// =========================
// STOCK IN
// =========================

let stockIn = [
    {
        id: 1,
        product: "Claw Hammer",
        quantity: "20",
        date: "2026-08-21",
        note: "Initial stock"
    }
];

let nextStockInID = 2;


// GET STOCK IN
app.get("/api/stock-in", (req, res) => {
    res.json(stockIn);
});


// ADD STOCK IN
app.post("/api/stock-in", (req, res) => {

    const newStockIn = {
        id: nextStockInID,
        product: req.body.product,
        quantity: req.body.quantity,
        date: req.body.date,
        note: req.body.note || ""
    };

    nextStockInID++;

    stockIn.push(newStockIn);

    console.log("Stock in added:", newStockIn);

    res.status(201).json(newStockIn);
});


// UPDATE STOCK IN
app.put("/api/stock-in/:id", (req, res) => {

    const id = Number(req.params.id);

    const editID = stockIn.findIndex(
        (item) => item.id === id
    );

    if (editID === -1) {
        return res.status(404).json({
            message: "Stock in record not found"
        });
    }

    stockIn[editID] = {
        id: id,
        product: req.body.product,
        quantity: req.body.quantity,
        date: req.body.date,
        note: req.body.note || ""
    };

    console.log("Updated stock in:", stockIn[editID]);

    res.json(stockIn[editID]);
});


// DELETE STOCK IN
app.delete("/api/stock-in/:id", (req, res) => {

    const id = Number(req.params.id);

    const deleteID = stockIn.findIndex(
        (item) => item.id === id
    );

    if (deleteID === -1) {
        return res.status(404).json({
            message: "Stock in record not found"
        });
    }

    const deletedStockIn = stockIn[deleteID];

    stockIn.splice(deleteID, 1);

    console.log("Deleted stock in:", deletedStockIn);

    res.json({
        message: "Stock in deleted successfully",
        stockIn: deletedStockIn
    });
});


// =========================
// SALES / STOCK OUT
// =========================

let sales = [
    {
        id: 1,
        product: "Claw Hammer",
        quantity: "3",
        date: "2026-08-22",
        amount: "1050",
        note: "Customer order"
    }
];

let nextSalesID = 2;


// GET SALES
app.get("/api/sales", (req, res) => {
    res.json(sales);
});


// ADD SALE
app.post("/api/sales", (req, res) => {

    const newSale = {
        id: nextSalesID,
        product: req.body.product,
        quantity: req.body.quantity,
        date: req.body.date,
        amount: req.body.amount,
        note: req.body.note || ""
    };

    nextSalesID++;

    sales.push(newSale);

    console.log("Sale added:", newSale);

    res.status(201).json(newSale);
});


// UPDATE SALE
app.put("/api/sales/:id", (req, res) => {

    const id = Number(req.params.id);

    const editID = sales.findIndex(
        (item) => item.id === id
    );

    if (editID === -1) {
        return res.status(404).json({
            message: "Sale not found"
        });
    }

    sales[editID] = {
        id: id,
        product: req.body.product,
        quantity: req.body.quantity,
        date: req.body.date,
        amount: req.body.amount,
        note: req.body.note || ""
    };

    console.log("Updated sale:", sales[editID]);

    res.json(sales[editID]);
});


// DELETE SALE
app.delete("/api/sales/:id", (req, res) => {

    const id = Number(req.params.id);

    const deleteID = sales.findIndex(
        (item) => item.id === id
    );

    if (deleteID === -1) {
        return res.status(404).json({
            message: "Sale not found"
        });
    }

    const deletedSale = sales[deleteID];

    sales.splice(deleteID, 1);

    console.log("Deleted sale:", deletedSale);

    res.json({
        message: "Sale deleted successfully",
        sale: deletedSale
    });
});


// =========================
// DAMAGED ITEMS
// =========================

let damaged = [
    {
        id: 1,
        product: "Claw Hammer",
        quantity: "2",
        date: "2026-08-20",
        reason: "Broken during handling"
    }
];

let nextDamagedID = 2;


// GET DAMAGED ITEMS
app.get("/api/damaged", (req, res) => {
    res.json(damaged);
});


// ADD DAMAGED ITEM
app.post("/api/damaged", (req, res) => {

    const newDamagedItem = {
        id: nextDamagedID,
        product: req.body.product,
        quantity: req.body.quantity,
        date: req.body.date,
        reason: req.body.reason
    };

    nextDamagedID++;

    damaged.push(newDamagedItem);

    console.log("Added damaged item:", newDamagedItem);

    res.status(201).json(newDamagedItem);
});


// UPDATE DAMAGED ITEM
app.put("/api/damaged/:id", (req, res) => {

    const id = Number(req.params.id);

    const editID = damaged.findIndex(
        (item) => item.id === id
    );

    if (editID === -1) {
        return res.status(404).json({
            message: "Damaged item not found"
        });
    }

    damaged[editID] = {
        id: id,
        product: req.body.product,
        quantity: req.body.quantity,
        date: req.body.date,
        reason: req.body.reason
    };

    console.log("Updated damaged item:", damaged[editID]);

    res.json(damaged[editID]);
});


// DELETE DAMAGED ITEM
app.delete("/api/damaged/:id", (req, res) => {

    const id = Number(req.params.id);

    const deleteID = damaged.findIndex(
        (item) => item.id === id
    );

    if (deleteID === -1) {
        return res.status(404).json({
            message: "Damaged item not found"
        });
    }

    const deletedDamagedItem = damaged[deleteID];

    damaged.splice(deleteID, 1);

    console.log("Deleted damaged item:", deletedDamagedItem);

    res.json({
        message: "Damaged item deleted successfully",
        damaged: deletedDamagedItem
    });
});


// =========================
// START SERVER
// =========================

app.listen(8080, () => {
    console.log("Server running on port 8080");
});