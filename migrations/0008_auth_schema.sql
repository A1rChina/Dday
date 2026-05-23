-- Migration number: 0008 	 2024-05-16T13:00:00.000Z

-- Add password_hash column to users table
ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';

-- Insert a default admin user if none exists
-- The password hash is for the password "admin" (SHA-256)
INSERT OR IGNORE INTO users (id, username, display_name, role, is_active, password_hash)
VALUES ('usr_admin', 'admin', 'Administrator', 'admin', 1, '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918');
