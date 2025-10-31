-- 更新albums表中performerIds为NULL的记录
UPDATE albums SET performerIds = '[]' WHERE performerIds IS NULL; 