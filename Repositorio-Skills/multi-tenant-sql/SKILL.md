---
name: Multi-Tenant SQL Generator
description: Generates secure multi-tenant SQL functions and RLS policies for Supabase with automatic workspace isolation
---

# Multi-Tenant SQL Generator Skill

## When to Activate This Skill

Automatically activate when the user:

- 🔐 Requests creation of SQL functions
- 🔐 Needs to query/modify tenant data
- 🔐 Creates new tables that store business data
- 🔐 Implements RPC endpoints for n8n
- 🔐 Mentions "multi-tenant", "workspace isolation", or "data security"

## Core Principles

### 🛡️ The Golden Rule

**EVERY function that touches tenant data MUST:**

1. Accept `p_workspace_id UUID` parameter (or use RLS context)
2. Filter by `workspace_id = p_workspace_id`
3. NEVER return data from other workspaces
4. Use indexes on `workspace_id` for performance

### 🚨 Security Enforcement Levels

**Level 1: Function Parameter (Explicit)**

```sql
CREATE FUNCTION my_function(
  p_workspace_id UUID,  -- Always first parameter
  other_params...
)
WHERE workspace_id = p_workspace_id
```

**Level 2: RLS Policy (Implicit)**

```sql
-- RLS automatically enforces on SELECT/INSERT/UPDATE/DELETE
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON my_table
  USING (workspace_id = current_workspace_id());
```

**Level 3: Combined (Defense in Depth)** ⭐ Recommended

```sql
-- Function has explicit parameter + table has RLS
-- Even if function is miscalled, RLS blocks cross-tenant access
```

---

## 📐 SQL Function Templates

### Template 1: Match Function (Vector Search)

```sql
CREATE OR REPLACE FUNCTION match_{table_name} (
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5,
  p_workspace_id UUID  -- ALWAYS required
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs with function owner privileges
AS $$
BEGIN
  -- Validate workspace_id is provided
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.content,
    t.metadata,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM {table_name} t
  WHERE t.workspace_id = p_workspace_id  -- CRITICAL: Tenant isolation
    AND (1 - (t.embedding <=> query_embedding)) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Performance: Index on workspace_id + embedding
CREATE INDEX IF NOT EXISTS idx_{table_name}_workspace_embedding
  ON {table_name} (workspace_id, embedding);
```

**Usage in n8n:**

```javascript
{
  "query_embedding": $json.embedding,
  "match_threshold": 0.5,
  "match_count": 5,
  "p_workspace_id": "{{ $json.workspace_id }}"
}
```

---

### Template 2: CRUD Function (Create/Read/Update/Delete)

```sql
-- Example: Get workspace statistics
CREATE OR REPLACE FUNCTION get_workspace_stats(
  p_workspace_id UUID
) RETURNS TABLE (
  total_leads INT,
  total_conversations INT,
  avg_response_time INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(DISTINCT l.id)::INT as total_leads,
    COUNT(DISTINCT c.id)::INT as total_conversations,
    AVG(c.response_time) as avg_response_time
  FROM leads l
  LEFT JOIN conversations c ON c.lead_id = l.id
  WHERE l.workspace_id = p_workspace_id  -- Isolation
    AND c.workspace_id = p_workspace_id; -- Double-check on joins
END;
$$;
```

---

### Template 3: Bulk Insert with Workspace Context

```sql
CREATE OR REPLACE FUNCTION bulk_insert_faqs(
  p_workspace_id UUID,
  p_faqs JSONB  -- Array of FAQs
) RETURNS TABLE (
  inserted_count INT,
  inserted_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  inserted_id UUID;
  ids UUID[] := '{}';
  faq JSONB;
BEGIN
  IF p_workspace_id IS NULL THEN
    RAISE EXCEPTION 'workspace_id is required';
  END IF;

  -- Loop through FAQs and insert with workspace_id
  FOR faq IN SELECT * FROM jsonb_array_elements(p_faqs)
  LOOP
    INSERT INTO knowledge_base (
      workspace_id,
      content,
      category,
      metadata,
      source
    ) VALUES (
      p_workspace_id,  -- Force workspace for ALL rows
      faq->>'content',
      faq->>'category',
      faq->'metadata',
      'admin_manual'
    )
    RETURNING id INTO inserted_id;

    ids := array_append(ids, inserted_id);
  END LOOP;

  RETURN QUERY
  SELECT
    array_length(ids, 1) as inserted_count,
    ids as inserted_ids;
END;
$$;
```

---

## 🔒 RLS Policy Templates

### Policy 1: Basic Workspace Isolation

```sql
-- Enable RLS on table
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Policy for regular users (via workspace_members)
DROP POLICY IF EXISTS "workspace_isolation_select" ON {table_name};
CREATE POLICY "workspace_isolation_select"
  ON {table_name} FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Policy for INSERT (prevent creating for other workspaces)
DROP POLICY IF EXISTS "workspace_isolation_insert" ON {table_name};
CREATE POLICY "workspace_isolation_insert"
  ON {table_name} FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Service role bypass (for n8n, backend services)
DROP POLICY IF EXISTS "service_role_all_access" ON {table_name};
CREATE POLICY "service_role_all_access"
  ON {table_name} FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

---

### Policy 2: Source-Based Permissions

```sql
-- Example: Only allow deletion of 'faq-generator' items, not 'seller_learning'
DROP POLICY IF EXISTS "allow_delete_admin_only" ON knowledge_base;
CREATE POLICY "allow_delete_admin_only"
  ON knowledge_base FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND metadata->>'source' = 'faq-generator'  -- Only ADM-generated
  );
```

---

## 🧪 Testing Multi-Tenant Functions

### Test 1: Workspace Isolation Verification

```sql
-- Setup: Create test workspaces
DO $$
DECLARE
  ws1 UUID := gen_random_uuid();
  ws2 UUID := gen_random_uuid();
BEGIN
  -- Insert data for workspace 1
  INSERT INTO knowledge_base (workspace_id, content)
  VALUES (ws1, 'WS1 Data');

  -- Insert data for workspace 2
  INSERT INTO knowledge_base (workspace_id, content)
  VALUES (ws2, 'WS2 Data');

  -- Test: Query WS1 should NOT return WS2 data
  ASSERT (
    SELECT count(*)
    FROM match_knowledge(..., p_workspace_id := ws1)
    WHERE content = 'WS2 Data'
  ) = 0, 'SECURITY BREACH: Cross-tenant data leak!';

  RAISE NOTICE 'Workspace isolation test PASSED';
END $$;
```

---

### Test 2: NULL workspace_id Handling

```sql
-- Should RAISE EXCEPTION
SELECT * FROM match_knowledge(
  ARRAY_FILL(0.0, ARRAY[1536])::vector,
  0.5,
  5,
  NULL  -- This should fail
);
-- Expected: ERROR: workspace_id is required
```

---

## 📊 Performance Optimization Rules

### Index Strategy for Multi-Tenant Tables

```sql
-- 1. Primary key (auto)
-- Already exists: PRIMARY KEY (id)

-- 2. Workspace isolation index (CRITICAL)
CREATE INDEX idx_{table}_workspace ON {table}(workspace_id);

-- 3. Composite indexes for common queries
CREATE INDEX idx_{table}_workspace_created
  ON {table}(workspace_id, created_at DESC);

-- 4. Vector search composite (for RAG tables)
CREATE INDEX idx_{table}_workspace_embedding
  ON {table} USING ivfflat (workspace_id, embedding vector_cosine_ops)
  WITH (lists = 100);  -- Adjust based on data size

-- 5. Metadata filters (if searching by category)
CREATE INDEX idx_{table}_workspace_category
  ON {table}(workspace_id, (metadata->>'category'));
```

**Performance Tip:** Always put `workspace_id` FIRST in composite indexes!

---

## 🚨 Common Pitfalls & Fixes

### ❌ Pitfall 1: Optional workspace_id

```sql
-- BAD: Makes workspace_id optional
WHERE workspace_id = COALESCE(p_workspace_id, workspace_id)

-- GOOD: Force requirement
IF p_workspace_id IS NULL THEN
  RAISE EXCEPTION 'workspace_id is required';
END IF;
```

---

### ❌ Pitfall 2: Joins Without Workspace Check

```sql
-- BAD: Join might leak data
FROM leads l
JOIN conversations c ON c.lead_id = l.id
WHERE l.workspace_id = p_workspace_id

-- GOOD: Check BOTH sides
FROM leads l
JOIN conversations c ON c.lead_id = l.id
WHERE l.workspace_id = p_workspace_id
  AND c.workspace_id = p_workspace_id
```

---

### ❌ Pitfall 3: SECURITY INVOKER Instead of DEFINER

```sql
-- BAD: Runs with caller's permissions (RLS applies)
CREATE FUNCTION ... SECURITY INVOKER

-- GOOD: Runs with owner's permissions (bypasses RLS if needed)
CREATE FUNCTION ... SECURITY DEFINER
-- Then apply workspace filtering in function logic
```

---

## 📋 Pre-Deployment Checklist

Before deploying any multi-tenant SQL:

- [ ] Function accepts `p_workspace_id` as parameter
- [ ] Function validates `p_workspace_id IS NOT NULL`
- [ ] All WHERE clauses filter by `workspace_id`
- [ ] All JOINs check `workspace_id` on both sides
- [ ] RLS policies enabled on table
- [ ] Service role policy exists (for n8n)
- [ ] Indexes created on `workspace_id`
- [ ] Tested with 2+ different workspace IDs
- [ ] Tested with NULL workspace_id (should fail)
- [ ] No hardcoded workspace IDs in code

---

## 🔄 Migration Pattern (Adding workspace_id to Existing Table)

```sql
-- Step 1: Add column (nullable initially)
ALTER TABLE existing_table
ADD COLUMN workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Step 2: Backfill with default workspace (if applicable)
UPDATE existing_table
SET workspace_id = 'YOUR_DEFAULT_WORKSPACE_UUID'
WHERE workspace_id IS NULL;

-- Step 3: Make NOT NULL
ALTER TABLE existing_table
ALTER COLUMN workspace_id SET NOT NULL;

-- Step 4: Add index
CREATE INDEX idx_existing_table_workspace
ON existing_table(workspace_id);

-- Step 5: Enable RLS
ALTER TABLE existing_table ENABLE ROW LEVEL SECURITY;

-- Step 6: Create policies (use templates above)
```

---

## 🎯 Success Criteria

Multi-tenant implementation is correct when:

1. ✅ Zero cross-tenant data leaks in tests
2. ✅ All functions require `p_workspace_id`
3. ✅ RLS enabled on all tenant-data tables
4. ✅ Indexes on `workspace_id` for all large tables
5. ✅ Service role policy exists (for backend access)
6. ✅ No SQL function returns data when `workspace_id = NULL`

---

## 💡 Pro Tips

- **Convention:** Prefix parameter with `p_` (e.g., `p_workspace_id`) to distinguish from column names
- **Logging:** Add `RAISE NOTICE` for debugging multi-tenant functions
- **Audit:** Create `audit_log` table with `workspace_id` for compliance
- **Testing:** Always test with ≥2 workspaces to catch isolation bugs
- **N8N:** Use `service_role` key, NOT `anon` key for RPC calls (bypasses RLS)

---

## 🔗 Related Skills

- Use **RAG N8N Debugger** skill for troubleshooting match functions
- Use **Agent Prompt Optimizer** skill when exposing functions as tools

---

## 📚 Reference: Filter Patterns

**Pattern 1: Exact Match**

```sql
WHERE workspace_id = p_workspace_id
```

**Pattern 2: Set Match (multiple workspaces)**

```sql
WHERE workspace_id = ANY(p_workspace_ids::UUID[])
```

**Pattern 3: Subquery Match (via relationships)**

```sql
WHERE workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
)
```

**Pattern 4: Metadata Match (when workspace_id is in JSONB)**

```sql
WHERE metadata->>'workspace_id' = p_workspace_id::TEXT
-- Note: Less performant, prefer column-based
```
