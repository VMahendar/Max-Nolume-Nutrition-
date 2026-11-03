PRAGMA foreign_keys = ON;
CREATE TABLE products (
 sku TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
 price_paise INTEGER NOT NULL CHECK(price_paise>=0), stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0),
 image_url TEXT NOT NULL DEFAULT '', published INTEGER NOT NULL DEFAULT 1 CHECK(published IN(0,1)),
 verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN(0,1)), hsn TEXT NOT NULL DEFAULT '',
 tax_bps INTEGER CHECK(tax_bps BETWEEN 0 AND 10000)
);
CREATE TABLE private_prices (
 sku TEXT NOT NULL REFERENCES products(sku), tier TEXT NOT NULL CHECK(tier IN('gym','dealer')),
 price_paise INTEGER NOT NULL CHECK(price_paise>=0), moq INTEGER NOT NULL DEFAULT 1 CHECK(moq>=1),
 PRIMARY KEY(sku,tier)
);
CREATE TABLE shipping_zones (
 pincode TEXT PRIMARY KEY, state_code TEXT NOT NULL, fee_paise INTEGER NOT NULL CHECK(fee_paise>=0),
 tax_bps INTEGER NOT NULL CHECK(tax_bps BETWEEN 0 AND 10000), verified INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE orders (
 id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE, fingerprint TEXT NOT NULL, access_hash TEXT NOT NULL,
 status TEXT NOT NULL CHECK(status IN('creating','pending','paid','paid_review','cancelled','expired','fulfilled','refunded')),
 total_paise INTEGER NOT NULL CHECK(total_paise>0), shipping_paise INTEGER NOT NULL,
 tax_paise INTEGER NOT NULL, tax_kind TEXT NOT NULL, address_json TEXT NOT NULL,
 provider_order TEXT UNIQUE, payment_id TEXT UNIQUE, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
);
CREATE INDEX orders_status_time ON orders(status,created_at);
CREATE TABLE order_items (
 order_id TEXT NOT NULL REFERENCES orders(id), sku TEXT NOT NULL REFERENCES products(sku),
 name TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99),
 unit_paise INTEGER NOT NULL CHECK(unit_paise>=0), tax_paise INTEGER NOT NULL,
 PRIMARY KEY(order_id,sku)
);
CREATE TRIGGER reserve_stock BEFORE INSERT ON order_items BEGIN
 UPDATE products SET stock=stock-NEW.quantity WHERE sku=NEW.sku AND stock>=NEW.quantity AND verified=1 AND published=1;
 SELECT CASE WHEN changes()<>1 THEN RAISE(ABORT,'INSUFFICIENT_STOCK') END;
END;
CREATE TRIGGER release_stock AFTER UPDATE OF status ON orders
WHEN OLD.status IN('creating','pending') AND NEW.status IN('cancelled','expired') BEGIN
 UPDATE products SET stock=stock+(SELECT quantity FROM order_items WHERE order_id=NEW.id AND sku=products.sku)
 WHERE sku IN(SELECT sku FROM order_items WHERE order_id=NEW.id);
END;
CREATE TABLE payment_events (event_key TEXT PRIMARY KEY, order_id TEXT NOT NULL REFERENCES orders(id), payment_id TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE rate_limits (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE INDEX rate_expiry ON rate_limits(expires_at);
CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, entity TEXT NOT NULL, created_at INTEGER NOT NULL);
