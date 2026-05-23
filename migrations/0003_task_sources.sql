ALTER TABLE task_instances
ADD COLUMN source_type TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE task_instances
ADD COLUMN source_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_task_instances_source
ON task_instances(source_type, source_key)
WHERE source_key IS NOT NULL;
