-- Run this in your Supabase SQL Editor to enable reordering
ALTER TABLE quick_links ADD COLUMN position INTEGER;

-- Optional: Initialize existing links with a default position based on creation date
WITH numbered_links AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as new_pos
  FROM quick_links
)
UPDATE quick_links
SET position = numbered_links.new_pos
FROM numbered_links
WHERE quick_links.id = numbered_links.id;
