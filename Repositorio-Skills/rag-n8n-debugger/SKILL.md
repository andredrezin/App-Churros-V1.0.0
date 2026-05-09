---
name: RAG N8N Debugger
description: Systematic troubleshooting and optimization for RAG workflows in n8n with Supabase Vector Store for multi-tenant applications
---

# RAG N8N Debugger Skill

## When to Activate This Skill

Automatically activate when the user reports:

- ❌ "Agent não chama/busca a ferramenta RAG"
- ❌ "Vector Store retorna vazio" / "No results found"
- ❌ Error: "function not found" / "PGRST202"
- ❌ "Agent inventa respostas em vez de buscar"
- ❌ Metadata filter not working
- ❌ Embedding dimension mismatch

## Core Diagnostic Framework

### 🔍 Phase 1: Agent Configuration Check

**LLM Settings:**

- ✅ Temperature MUST be ≤ 0.3 (ideally 0.2)
  - Higher = creative/hallucination risk
  - Lower = obedient/deterministic
- ✅ Model: `gemini-1.5-flash` OR `gpt-4o-mini` OR `gpt-4o`
- ✅ Max tokens: 500-1000 (sufficient for tool calls)

**Agent Prompt Structure (IMPERATIVE):**

```markdown
# RULE: Tool-Only Mode

You MUST use the search tool. You have NO intrinsic knowledge.

BEFORE responding:

1. Call tool: {tool_name}
2. Pass query: "{user_message}"
3. Return ONLY tool results

FORBIDDEN:

- Answer without calling tool
- Invent information
- Use general knowledge
```

**Tool Description (EXPLICIT):**

```
Searches company knowledge base. Contains ALL info: products, prices, policies.
Use ALWAYS when lead asks ANYTHING about the company.
```

---

### 🗄️ Phase 2: Vector Store Configuration

**Supabase Vector Store Node:**

- ✅ `mode`: `"load"` (retrieve mode)
- ✅ `tableName`: `"knowledge_base"` or `"documents"`
- ✅ `queryName`:
  - If custom function exists: `"match_knowledge"` (with workspace_id param)
  - If using default: `"match_documents"` (standard n8n)
- ✅ `topK`: Fixed integer (e.g., `5`), NOT dynamic `$fromAI(...)`

**Metadata Filter (Multi-tenant Critical):**

```javascript
{
  "metadataValues": [
    {
      "name": "workspace_id",
      "value": "={{ $('organiza-dados').item.json.workspace_id }}"
    }
  ]
}
```

**Embedding Model:**

- ✅ `text-embedding-3-small` (1536 dimensions)
- ✅ Connected to Vector Store via `ai_embedding`
- ❌ Do NOT use duplicate HTTP Request for embeddings

---

### 🧮 Phase 3: SQL Function Validation

**Check Function Exists:**

```sql
-- List all match functions
SELECT
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname LIKE 'match%';
```

**Expected Output:**

- `match_documents(vector, int, jsonb)` OR
- `match_knowledge(vector, int, int, uuid)` (our custom version)

**If Missing - Create Standard Function:**

```sql
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 5,
  filter JSONB DEFAULT '{}'
) RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  ws_id UUID;
BEGIN
  -- Extract workspace_id from filter if exists
  ws_id := (filter->>'workspace_id')::UUID;

  RETURN QUERY
  SELECT
    kb.id,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) AS similarity
  FROM knowledge_base kb
  WHERE (ws_id IS NULL OR kb.workspace_id = ws_id)
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Reload schema cache
NOTIFY pgrst, 'reload config';
```

**Test Function Manually:**

```sql
-- Generate test embedding (zeros)
SELECT * FROM match_documents(
  ARRAY_FILL(0.0, ARRAY[1536])::vector,
  5,
  '{"workspace_id": "4f2e7764-d713-4a19-a7ef-b6bda4f960dd"}'::jsonb
);
```

---

### 📊 Phase 4: Data Validation

**Check Data Exists:**

```sql
-- Count total FAQs
SELECT count(*) as total FROM knowledge_base;

-- Count per workspace
SELECT
  workspace_id,
  count(*) as faqs
FROM knowledge_base
GROUP BY workspace_id;

-- Check specific workspace
SELECT count(*)
FROM knowledge_base
WHERE workspace_id = '4f2e7764-d713-4a19-a7ef-b6bda4f960dd';
```

**Validate Embedding Dimensions:**

```sql
SELECT vector_dims(embedding) as dimensions
FROM knowledge_base
LIMIT 1;
```

- ✅ Expected: `1536` (for text-embedding-3-small)
- ❌ If different: Re-generate embeddings with correct model

---

### 🔗 Phase 5: Connection Topology Validation

**Correct Flow:**

```
Webhook
  ↓
organiza-dados (Set - extract fields)
  ↓
Agent RAG
  ├─ Gemini Flash (ai_languageModel)
  ├─ Postgres Memory (ai_memory)
  └─ Tool - Buscar FAQs (ai_tool)
       ↓
     Supabase Vector Store (ai_vectorStore)
       ↓
     Embeddings OpenAI (ai_embedding)
```

**Common Mistakes:**

- ❌ HTTP Embedding node in main flow (orphaned, ignored by Agent)
- ❌ LLM connected to Tool instead of Agent only
- ❌ Multiple embedding nodes (causes confusion)
- ❌ Tool not connected to Agent via `ai_tool`

---

## 🛠️ Standard Fix Procedure

When Agent doesn't call tool, apply in this order:

1. **Lower Temperature:** Set to `0.2` in Gemini/OpenAI node
2. **Imperative Prompt:** Rewrite with "MUST use tool" language
3. **Fix SQL:** Ensure `match_documents` exists and uses `workspace_id` column
4. **Remove Duplicates:** Delete orphaned HTTP Embedding nodes
5. **Test Isolation:** Execute just the Vector Store node with mock query

---

## 📋 Pre-Flight Checklist

Before considering the RAG workflow "production-ready":

- [ ] Agent Logs show `"Calling tool: ..."`
- [ ] Vector Store returns exactly 5 documents (or configured topK)
- [ ] Metadata filter correctly isolates workspace
- [ ] SQL function handles NULL workspace_id gracefully
- [ ] Temperature ≤ 0.3
- [ ] No duplicate embedding nodes exist
- [ ] Postgres Memory configured with `conversation_id`
- [ ] Tool description is explicit and directive

---

## 🚨 Emergency Diagnostic Commands

**Quick SQL Health Check:**

```sql
-- 1. Function exists?
SELECT count(*) FROM pg_proc WHERE proname = 'match_documents';

-- 2. Data exists for workspace?
SELECT count(*) FROM knowledge_base WHERE workspace_id = 'YOUR_UUID';

-- 3. Embeddings are valid?
SELECT count(*) FROM knowledge_base WHERE embedding IS NOT NULL;

-- 4. Example search works?
SELECT content FROM match_documents(
  ARRAY_FILL(0.0, ARRAY[1536])::vector,
  3,
  '{}'::jsonb
) LIMIT 3;
```

**n8n Workflow Quick Fix:**

1. Open Agent node → Logs tab
2. Look for: `"No tool calls"` → Problem is prompt/temperature
3. Look for: `"Tool error"` → Problem is SQL/Vector Store config

---

## 📚 Reference: Match Function Variants

**Variant 1: Standard (Column-based workspace_id)**

```sql
-- Uses workspace_id as COLUMN in knowledge_base
WHERE kb.workspace_id = (filter->>'workspace_id')::UUID
```

**Variant 2: Metadata-based (workspace_id inside metadata JSONB)**

```sql
-- Uses workspace_id inside metadata field
WHERE kb.metadata @> filter
```

**Variant 3: Custom with explicit param (Our original)**

```sql
CREATE FUNCTION match_knowledge(
  query_embedding VECTOR,
  match_threshold FLOAT,
  match_count INT,
  p_workspace_id UUID  -- Explicit parameter
)
```

Choose based on table structure. For `knowledge_base` with `workspace_id` column, use Variant 1.

---

## 🎯 Success Criteria

Workflow is working correctly when ALL are true:

1. ✅ Agent Logs show tool call on every query
2. ✅ Vector Store Output contains 5 similar documents
3. ✅ Each document has `similarity` score > 0.5
4. ✅ All returned docs match the correct `workspace_id`
5. ✅ Agent output references tool results (not inventing)
6. ✅ Memory persists across conversation turns

---

## 💡 Pro Tips

- Use `mode: "load"` for retrieval, `mode: "insert"` for ingestion (separate workflows)
- Always test SQL function with ARRAY_FILL(0.0, ...) for quick validation
- Agent creativity inversely correlates with tool usage (low temp = high tool usage)
- Metadata filters are case-sensitive and type-strict (UUID vs String matters)
- Postgres Memory requires Connection Pooling (port 6543), not Direct Connection

---

## 🆕 Smart RAG by Lead Stage

### Stage-aware Knowledge Retrieval

Use `stage_confidence` to weight documents differently per lead stage:

```sql
SELECT
  kb.id,
  kb.content,
  kb.metadata->>'category' as category,
  COALESCE(kb.confidence, 0.5) as base_confidence,
  COALESCE(ksp.stage_confidence, 0.5) as stage_confidence,
  ROUND((1 - (kb.embedding <=> query_embedding::vector))::numeric, 4) as similarity,
  -- Final score: similarity * stage_confidence
  ROUND(((1 - (kb.embedding <=> query_embedding::vector)) *
         COALESCE(ksp.stage_confidence, kb.confidence, 0.5))::numeric, 4) as final_score
FROM knowledge_base kb
LEFT JOIN knowledge_stage_performance ksp
  ON kb.id = ksp.knowledge_id AND ksp.stage = 'Vinculo'
WHERE
  (kb.metadata->>'workspace_id')::text = workspace_id
  AND (kb.embedding <=> query_embedding::vector) < 0.8
ORDER BY final_score DESC
LIMIT 10;
```

### Performance Tracking Table

```sql
CREATE TABLE knowledge_stage_performance (
  knowledge_id UUID REFERENCES knowledge_base(id),
  stage VARCHAR(20) NOT NULL,
  stage_confidence REAL DEFAULT 0.5,
  times_used INTEGER DEFAULT 0,
  times_helped_progress INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  PRIMARY KEY (knowledge_id, stage)
);

-- Update function after each interaction
CREATE OR REPLACE FUNCTION update_knowledge_stage_performance(
  p_knowledge_id UUID,
  p_stage VARCHAR(20),
  p_progressed BOOLEAN
) RETURNS VOID AS $$
BEGIN
  INSERT INTO knowledge_stage_performance (knowledge_id, stage, times_used, times_helped_progress, last_used_at)
  VALUES (p_knowledge_id, p_stage, 1,
          CASE WHEN p_progressed THEN 1 ELSE 0 END, NOW())
  ON CONFLICT (knowledge_id, stage) DO UPDATE SET
    times_used = knowledge_stage_performance.times_used + 1,
    times_helped_progress = knowledge_stage_performance.times_helped_progress +
                            CASE WHEN p_progressed THEN 1 ELSE 0 END,
    stage_confidence = (knowledge_stage_performance.times_helped_progress::real +
                        CASE WHEN p_progressed THEN 1 ELSE 0 END) /
                       (knowledge_stage_performance.times_used::real + 1),
    last_used_at = NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## 🆕 Data Extraction with deepFind

For nested webhook/subflow data, use robust extraction:

```javascript
function deepFind(obj, key, maxDepth = 6) {
  if (!obj || maxDepth === 0) return null;
  if (obj[key] !== undefined && obj[key] !== null && obj[key] !== "")
    return obj[key];
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === "object" && obj[k] !== null) {
      const found = deepFind(obj[k], key, maxDepth - 1);
      if (found !== null) return found;
    }
  }
  return null;
}

// Extract all needed fields
const dados = {
  telefone: deepFind(input, "telefone") || "",
  lead_id: deepFind(input, "lead_id") || "",
  workspace_id: deepFind(input, "workspace_id") || "",
  conversation_id: deepFind(input, "conversation_id") || "",
  mensagem: deepFind(input, "mensagem") || "",
  contexto_rag: deepFind(input, "contexto_rag") || "",
};
```

---

## 🔄 When to Re-run This Diagnostic

- After any Agent prompt modification
- After changing LLM model or temperature
- After Supabase schema changes
- When migrating between `match_documents` and `match_knowledge`
- When adding new metadata filters
- After n8n version upgrades
- After modifying stage-based RAG queries
- When knowledge performance seems degraded
