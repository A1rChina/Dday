-- 为 production_reports 表增加质量异常关联字段
-- 当报工产生不良品时，系统自动创建质量异常单，并在此处关联

ALTER TABLE production_reports ADD COLUMN quality_issue_id TEXT REFERENCES quality_issues(id) ON DELETE SET NULL;
ALTER TABLE production_reports ADD COLUMN freeze_id TEXT REFERENCES material_freezes(id) ON DELETE SET NULL;

-- 为 quality_issues 增加 production_report_id，明确溯源到具体报工记录
ALTER TABLE quality_issues ADD COLUMN production_report_id TEXT REFERENCES production_reports(id) ON DELETE SET NULL;
