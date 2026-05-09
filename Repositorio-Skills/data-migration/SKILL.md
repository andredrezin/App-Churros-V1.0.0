---
name: Data Migration Helper
description: Safe database migrations, schema changes, and data transformations for multi-tenant Supabase applications
---

# Data Migration Helper Skill

## When to Activate This Skill

Automatically activate when:

- 🔄 Adding/modifying database columns
- 🔄 Creating new tables
- 🔄 Migrating data between schemas
- 🔄 Backfilling data
- 🔄 Changing data types or constraints

## Core Migration Principles

### 🛡️ The Golden Rules

1. **Migrations are one-way:** Never rollback, only forward
2. **Zero-downtime:** Production must stay online during migration
3. **Transactional:** Use transactions where possible
4. **Testable:** Test on copy of production data first
5. **Multi-tenant safe:** Never mix workspace data

---

## 📐 Migration Templates

### Template 1: Adding a Column

```sql
-- Step 1: Add column as NULLABLE (safe, no downtime)
ALTER TABLE knowledge_base
ADD COLUMN source TEXT;

-- Step 2: Backfill existing data
UPDATE knowledge_base
SET source = 'legacy'
WHERE source IS NULL;

-- Step 3: Make NOT NULL (only after backfill complete!)
ALTER TABLE knowledge_base
ALTER COLUMN source SET NOT NULL;

-- Step 4: Add default for future inserts
ALTER TABLE knowledge_base
ALTER COLUMN source SET DEFAULT 'admin_manual';

-- Step 5: Create index if needed
CREATE INDEX idx_kb_source
ON knowledge_base(source);
```

**Zero-Downtime Key:** Step 1 is instant (no data rewrite)

---

### Template 2: Adding workspace_id to Existing Table

```sql
-- SCENARIO: Table without multi-tenancy needs isolation

-- Step 1: Add column (nullable)
ALTER TABLE existing_table
ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Step 2: Create migration context (if needed)
-- If you have a "default workspace":
DO $$
DECLARE
  default_ws UUID := (SELECT id FROM workspaces ORDER BY created_at LIMIT 1);
BEGIN
  UPDATE existing_table
  SET workspace_id = default_ws
  WHERE workspace_id IS NULL;
END $$;

-- OR: Map via user relationship
UPDATE existing_table et
SET workspace_id = (
  SELECT wm.workspace_id
  FROM workspace_members wm
  WHERE wm.user_id = et.user_id
  LIMIT 1
)
WHERE et.workspace_id IS NULL;

-- Step 3: Enforce NOT NULL
ALTER TABLE existing_table
ALTER COLUMN workspace_id SET NOT NULL;

-- Step 4: Add index (critical for performance)
CREATE INDEX idx_existing_table_workspace
ON existing_table(workspace_id);

-- Step 5: Enable RLS
ALTER TABLE existing_table ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies (see Multi-Tenant SQL skill)
CREATE POLICY "workspace_isolation"
ON existing_table FOR ALL
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));
```

---

### Template 3: Changing Column Type

```sql
-- PROBLEM: Need to change embedding from vector(1536) to vector(3072)

-- Step 1: Add new column with new type
ALTER TABLE knowledge_base
ADD COLUMN embedding_new VECTOR(3072);

-- Step 2: Migrate data (in batches to avoid locks)
DO $$
DECLARE
  batch_size INT := 1000;
  offset_val INT := 0;
BEGIN
  LOOP
    UPDATE knowledge_base
    SET embedding_new = embedding::vector(3072)  -- Dimension expansion
    WHERE id IN (
      SELECT id FROM knowledge_base
      WHERE embedding_new IS NULL
      LIMIT batch_size
    );

    EXIT WHEN NOT FOUND;
    offset_val := offset_val + batch_size;
    RAISE NOTICE 'Migrated % rows', offset_val;
  END LOOP;
END $$;

-- Step 3: Create index on new column
CREATE INDEX idx_kb_embedding_new
ON knowledge_base USING ivfflat (embedding_new vector_cosine_ops);

-- Step 4: Update application to use embedding_new

-- Step 5: Drop old column (after confirming app works)
ALTER TABLE knowledge_base
DROP COLUMN embedding;

-- Step 6: Rename new column to original name
ALTER TABLE knowledge_base
RENAME COLUMN embedding_new TO embedding;
```

---

### Template 4: Splitting a Table(Vertical Partitioning)

```sql
-- SCENARIO: knowledge_base table too large, split by source

-- Step 1: Create new tables
CREATE TABLE knowledge_base_admin (
  LIKE knowledge_base INCLUDING ALL
);

CREATE TABLE knowledge_base_learned (
  LIKE knowledge_base INCLUDING ALL
);

-- Step 2: Copy data
INSERT INTO knowledge_base_admin
SELECT * FROM knowledge_base
WHERE metadata->>'source' IN ('faq-generator', 'admin_manual');

INSERT INTO knowledge_base_learned
SELECT * FROM knowledge_base
WHERE metadata->>'source' = 'seller_learning';

-- Step 3: Create view for backward compatibility
CREATE OR REPLACE VIEW knowledge_base_unified AS
  SELECT * FROM knowledge_base_admin
  UNION ALL
  SELECT * FROM knowledge_base_learned;

-- Step 4: Update application to query new tables directly

-- Step 5: Drop original table (after migration confirmed)
DROP TABLE knowledge_base;
```

---

## 🧪 Testing Migrations

### Pre-Migration Checklist

```sql
-- 1. Backup production (auto if using Supabase, manual otherwise)
-- 2. Create staging environment with production data copy
-- 3. Run migration on staging
-- 4. Validate:

-- Check row counts match
SELECT
  (SELECT count(*) FROM source_table) as source_count,
  (SELECT count(*) FROM target_table) as target_count;

-- Check sample data correctness
SELECT * FROM source_table LIMIT 10;
SELECT * FROM target_table LIMIT 10;

-- Check no NULL values where NOT NULL expected
SELECT count(*) FROM target_table WHERE critical_column IS NULL;
-- Should be 0

-- Check foreign key integrity
SELECT count(*) FROM target_table t
LEFT JOIN referenced_table r ON t.fk_id = r.id
WHERE r.id IS NULL;
-- Should be 0
```

---

## 📊 Data Transformation Patterns

### Pattern 1: JSON to Columns

```sql
-- BEFORE: metadata = {"category": "product", "tags": ["new"]}
-- AFTER: category column + tags column

-- Step 1: Add columns
ALTER TABLE knowledge_base
ADD COLUMN category TEXT,
ADD COLUMN tags TEXT[];

-- Step 2: Extract and populate
UPDATE knowledge_base
SET
  category = metadata->>'category',
  tags = ARRAY(SELECT jsonb_array_elements_text(metadata->'tags'));

-- Step 3: Remove from metadata (optional)
UPDATE knowledge_base
SET metadata = metadata - 'category' - 'tags';
```

---

### Pattern 2: Denormalization for Performance

```sql
-- PROBLEM: Join to workspace_members on every query is slow

-- Step 1: Add denormalized column
ALTER TABLE conversations
ADD COLUMN workspace_name TEXT;

-- Step 2: Populate
UPDATE conversations c
SET workspace_name = w.name
FROM workspaces w
WHERE c.workspace_id = w.id;

-- Step 3: Keep in sync with trigger
CREATE OR REPLACE FUNCTION sync_workspace_name()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.name != NEW.name THEN
    UPDATE conversations
    SET workspace_name = NEW.name
    WHERE workspace_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workspace_name_sync
AFTER UPDATE ON workspaces
FOR EACH ROW
EXECUTE FUNCTION sync_workspace_name();
```

---

## 🚨 Handling Large Migrations

### Batch Processing

```sql
-- For tables with millions of rows, batch updates to avoid locks

DO $$
DECLARE
  batch_size INT := 10000;
  rows_updated INT;
  total_updated INT := 0;
BEGIN
  LOOP
    -- Update one batch
    WITH batch AS (
      SELECT id FROM large_table
      WHERE needs_migration = true
      LIMIT batch_size
      FOR UPDATE SKIP LOCKED  -- Don't wait on locks
    )
    UPDATE large_table
    SET
      new_column = compute_value(old_column),
      needs_migration = false
    WHERE id IN (SELECT id FROM batch);

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    total_updated := total_updated + rows_updated;

    RAISE NOTICE 'Updated % rows (total: %)', rows_updated, total_updated;

    -- Exit when no more rows to update
    EXIT WHEN rows_updated = 0;

    -- Optional: Sleep between batches to reduce load
    PERFORM pg_sleep(0.1);
  END LOOP;

  RAISE NOTICE 'Migration complete. Total rows: %', total_updated;
END $$;
```

---

## 🔄 Rollback Strategies

### Safe Rollback Pattern

```sql
-- Instead of ALTER TABLE DROP COLUMN (irreversible),
-- use multi-step deprecation:

-- Phase 1: Add new column
ALTER TABLE my_table ADD COLUMN new_col TEXT;

-- Phase 2: Dual-write (application writes to BOTH columns)
-- App code updated to populate both old_col and new_col

-- Phase 3: Backfill historical data
UPDATE my_table SET new_col = old_col WHERE new_col IS NULL;

-- Phase 4: Switch reads to new column
-- App code reads from new_col, falls back to old_col if NULL

-- Phase 5: Stop writing to old column
-- App code only writes to new_col

-- Phase 6: (After 1 week) Drop old column
ALTER TABLE my_table DROP COLUMN old_col;

-- ROLLBACK: If issue found before Phase 6, just reverse app code
-- No data loss because old_col still exists!
```

---

## 📋 Migration Runbook Template

```markdown
# Migration: [Name]

Date: [YYYY-MM-DD]
Ticket: [JIRA-123]

## Objective

Brief description of what and why

## Pre-requisites

- [ ] Staging environment tested
- [ ] Backup confirmed
- [ ] Rollback plan documented
- [ ] Team notified

## Execution Steps

1. [Step 1 SQL]
   Expected duration: X minutes
   Expected impact: None | Read-only mode | Downtime
2. [Step 2 SQL]
   ...

## Validation

- [ ] Row counts match: SELECT count(\*) FROM ...
- [ ] Sample data correct: SELECT \* FROM ... LIMIT 10
- [ ] No NULLs: SELECT count(\*) WHERE col IS NULL
- [ ] Application working: Test key user flows

## Rollback Plan

If validation fails:

1. [Rollback step 1]
2. [Rollback step 2]

## Post-Migration

- [ ] Update documentation
- [ ] Notify team of completion
- [ ] Monitor for 24h
```

---

## 🎯 Multi-Tenant Migration Safety

### Verify Workspace Isolation After Migration

```sql
-- Test 1: Try to access other workspace's data
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims.sub = 'user-in-ws-A';

SELECT count(*) FROM my_table
WHERE workspace_id != 'workspace-A-uuid';
-- Should be 0 (RLS should block)

-- Test 2: Create data in one workspace, verify isolation
INSERT INTO my_table (workspace_id, data)
VALUES ('workspace-A', 'test');

SET LOCAL request.jwt.claims.sub = 'user-in-ws-B';
SELECT * FROM my_table WHERE data = 'test';
-- Should return 0 rows (user-B can't see ws-A data)
```

---

## 💡 Best Practices

### DO:

✅ Test on staging first  
✅ Use transactions for atomic changes  
✅ Add columns as nullable, backfill, then enforce  
✅ Create indexes CONCURRENTLY (no locks)  
✅ Batch large updates  
✅ Document every migration  
✅ Keep old columns for 1+ week before dropping

### DON'T:

❌ Run migrations during peak hours  
❌ Drop columns immediately  
❌ Change types without intermediate column  
❌ Mix schema + data changes in one transaction  
❌ Forget to update indexes  
❌ Skip testing  
❌ Assume migrations are reversible

---

## 🔧 Useful Migration Queries

### Find Large Tables

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Find Missing Indexes

```sql
SELECT
  schemaname,
  tablename,
  attname as column_name
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100  -- High cardinality
  AND tablename NOT IN (
    SELECT tablename FROM pg_indexes WHERE indexname LIKE '%'||attname||'%'
  );
```

### Estimate Migration Time

```sql
-- Test update on 1% sample
EXPLAIN ANALYZE
UPDATE my_table
SET new_col = old_col
WHERE id IN (SELECT id FROM my_table TABLESAMPLE BERNOULLI (1));

-- Multiply execution time by 100 for full table estimate
```

---

## 🔗 Integration with Other Skills

- Use **Multi-Tenant SQL** for post-migration RLS setup
- Use **Performance Monitoring** to track migration impact
- Use **N8N Workflow Validator** if migrations affect workflow schemas
