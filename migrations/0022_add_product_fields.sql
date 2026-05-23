-- Add new columns to products: project_code, factory, profile_code
ALTER TABLE products ADD COLUMN project_code TEXT;
ALTER TABLE products ADD COLUMN factory TEXT NOT NULL DEFAULT '宜宾';
ALTER TABLE products ADD COLUMN profile_code TEXT;

-- Backfill existing data
UPDATE products 
SET project_code = (
  SELECT name FROM projects WHERE projects.id = products.project_id
)
WHERE project_id IS NOT NULL;

UPDATE products 
SET profile_code = code || '-YL'
WHERE profile_code IS NULL OR profile_code = '';
