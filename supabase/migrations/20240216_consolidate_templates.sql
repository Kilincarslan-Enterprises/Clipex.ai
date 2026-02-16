-- Drop foreign key constraint from renders table first
ALTER TABLE renders
DROP CONSTRAINT IF EXISTS renders_template_id_fkey;

-- Now we can safely drop the redundant templates table
DROP TABLE IF EXISTS templates;

-- Add foreign key constraint to link template_id to projects table instead
ALTER TABLE renders
ADD CONSTRAINT renders_template_id_fkey
FOREIGN KEY (template_id)
REFERENCES projects(id)
ON DELETE SET NULL;

-- Ensure projects table has necessary fields if missing (it should have them from init.sql)
-- Just to be safe, we verify projects table structure matches our needs (data column is jsonb)
-- This is just a sanity check comment, no action needed as projects table is core.
