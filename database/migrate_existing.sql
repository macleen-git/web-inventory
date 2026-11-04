USE hardware_inventory_v2;

-- Run this only if you created the tables using the earlier setup SQL.
-- It aligns the original timestamp column names with the Express API.
ALTER TABLE stock_in CHANGE COLUMN stock_in_date date DATE NOT NULL;
ALTER TABLE sales CHANGE COLUMN sale_date date DATE NOT NULL;
ALTER TABLE damaged_items CHANGE COLUMN damaged_date date DATE NOT NULL;
