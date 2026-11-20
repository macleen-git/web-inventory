ALTER TABLE damaged_items
  ADD COLUMN unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER date,
  ADD COLUMN total_loss DECIMAL(12,2) NOT NULL DEFAULT 0.00 AFTER unit_cost;

UPDATE damaged_items d
JOIN products p ON p.id = d.product_id
SET d.unit_cost = p.buy,
    d.total_loss = p.buy * d.quantity
WHERE d.total_loss = 0.00;
