---
name: Performance & Monitoring
description: Performance optimization, monitoring, logging, and alerting strategies for n8n + Supabase multi-tenant applications
---

# Performance & Monitoring Skill

## When to Activate This Skill

Automatically activate when:

- 📊 Investigating slow workflow execution
- 📊 Setting up monitoring/alerting
- 📊 Optimizing database queries
- 📊 Reviewing system logs
- 📊 Planning production deployment

## Performance Optimization

### 🚀 Database Performance

**Query Optimization:**

```sql
-- BAD: Full table scan
SELECT * FROM knowledge_base WHERE content LIKE '%produto%';

-- GOOD: Indexed search with workspace filter
SELECT * FROM knowledge_base
WHERE workspace_id = $1
  AND content ILIKE $2
LIMIT 100;

-- Create supporting index:
CREATE INDEX idx_kb_workspace_content
ON knowledge_base(workspace_id, content text_pattern_ops);
```

**Vector Search Performance:**

```sql
-- Optimize embedding index
CREATE INDEX idx_embedding_ivfflat
ON knowledge_base
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- For better recall (slower but more accurate):
SET ivfflat.probes = 10;

-- Monitor vector search speed:
EXPLAIN ANALYZE
SELECT * FROM match_documents(
  $1::vector, 5, '{}'::jsonb
);
```

**Connection Pooling:**

```yaml
# Use pooler for high-throughput
Host: pooler.supabase.com
Port: 6543
Mode: transaction

# Use direct for long-running queries
Host: db.supabase.com
Port: 5432
```

---

### ⚡ n8n Workflow Optimization

**Parallel Execution:**

```javascript
// Sequential (slow): 3 seconds total
Node A (1s) → Node B (1s) → Node C (1s)

// Parallel (fast): 1 second total
       ┌→ Node A (1s) ─┐
Entry ─┤→ Node B (1s) ─┤→ Merge
       └→ Node C (1s) ─┘
```

**Batch Processing:**

```javascript
// Instead of N RPC calls:
FOR each item IN items:
  CALL supabase_rpc(item)  // 100 calls = slow

// Make 1 bulk call:
CALL supabase_rpc_bulk(items)  // 1 call = fast
```

**Caching Strategies:**

```javascript
// Cache expensive operations in Set node
Set node "Cache Embeddings":
  embedding: {{ $json.cached_embedding }}

→ Reuse in multiple downstream nodes
```

---

### 🎯 LLM Cost & Speed Optimization

**Model Selection:**

```yaml
Development:
  - gemini-1.5-flash (fastest, cheap)
  - gpt-4o-mini (good quality, cheap)

Production (high-value):
  - gpt-4o (best quality, expensive)
  - claude-3.5-sonnet (best reasoning, expensive)

Recommendation: Start with Flash → Upgrade only if quality insufficient
```

**Token Optimization:**

```javascript
// BAD: Send entire chat history
prompt: {{ $json.chat_history }}  // Could be 10,000 tokens!

// GOOD: Use memory with window
Postgres Memory: contextWindowLength: 10  // Last 10 messages only
```

**Temperature Effects:**

```yaml
Temperature 0.0-0.2:
  Speed: Fast (low sampling)
  Cost: Low (fewer tokens)
  Use: Tool-calling, structured output

Temperature 0.7-1.0:
  Speed: Slower (high sampling)
  Cost: Higher (more tokens)
  Use: Creative writing, personality
```

---

## 📊 Monitoring & Observability

### Supabase Metrics

**Query Performance Dashboard:**

```sql
-- Top 10 slowest queries
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Table Size Monitoring:**

```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS bytes
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY bytes DESC;
```

**Index Usage:**

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,  -- Number of times index was used
  idx_tup_read  -- Rows read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan ASC;  -- Unused indexes first
```

---

### n8n Execution Monitoring

**Execution Time Tracking:**

```javascript
// Add Set node at start:
Set "Start Timer":
  start_time: {{ $now }}

// Add Set node at end:
Set "End Timer":
  start_time: {{ $('Start Timer').item.json.start_time }}
  end_time: {{ $now }}
  duration_ms: {{ $now.diff($('Start Timer').item.json.start_time) }}

// Log to Supabase:
INSERT INTO execution_logs (
  workflow_name,
  duration_ms,
  workspace_id,
  status
) VALUES (...);
```

**Error Rate Monitoring:**

```sql
-- Create logging table
CREATE TABLE workflow_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_name TEXT,
  workspace_id UUID,
  status TEXT,  -- 'success' | 'error'
  duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query error rate
SELECT
  workflow_name,
  COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*) AS error_rate,
  AVG(duration_ms) AS avg_duration
FROM workflow_executions
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY workflow_name;
```

---

### Real-Time Alerting

**Supabase Database Webhooks:**

```sql
-- Create trigger for high error rate
CREATE OR REPLACE FUNCTION notify_high_error_rate()
RETURNS TRIGGER AS $$
BEGIN
  -- If error rate > 10% in last hour
  IF (
    SELECT COUNT(*) FILTER (WHERE status = 'error') * 1.0 / COUNT(*)
    FROM workflow_executions
    WHERE created_at > NOW() - INTERVAL '1 hour'
  ) > 0.1 THEN
    -- Call n8n webhook
    PERFORM http_post(
      'https://n8n.../webhook/alert-high-errors',
      json_build_object('workflow', NEW.workflow_name)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**n8n Error Workflow:**

```yaml
Webhook: /alert-high-errors
  ↓
IF: error_rate > threshold
  ↓
Send Notification:
  - Email to admin
  - Slack message
  - SMS (critical)
```

---

## 🔍 Logging Best Practices

### Structured Logging

**Application Logs:**

```sql
CREATE TABLE app_logs (
  id BIGSERIAL PRIMARY KEY,
  level TEXT,  -- 'info' | 'warn' | 'error'
  source TEXT,  -- 'n8n' | 'frontend' | 'supabase'
  message TEXT,
  context JSONB,  -- Additional metadata
  workspace_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_level_created ON app_logs(level, created_at DESC);
CREATE INDEX idx_logs_workspace ON app_logs(workspace_id, created_at DESC);
```

**What to Log:**

```javascript
// INFO: Normal operations
{
  level: 'info',
  source: 'etapa_03_rag',
  message: 'RAG retrieval completed',
  context: {
    workspace_id: '...',
    faqs_found: 5,
    duration_ms: 234
  }
}

// WARN: Recoverable issues
{
  level: 'warn',
  source: 'etapa_03_rag',
  message: 'No FAQs found for query',
  context: {
    workspace_id: '...',
    query: 'produto XYZ'
  }
}

// ERROR: Failures
{
  level: 'error',
  source: 'etapa_03_rag',
  message: 'RPC call failed',
  context: {
    workspace_id: '...',
    error: 'PGRST202',
    stack: '...'
  }
}
```

---

## 📈 Key Metrics to Track

### Application Metrics

```yaml
Workflow Metrics:
  - Execution count (per workflow)
  - Success rate (%)
  - Average duration (ms)
  - P95 duration (ms)
  - Error count

RAG Metrics:
  - Queries per second
  - Average results returned
  - Cache hit rate
  - Embedding generation time
  - Vector search time

User Metrics:
  - Active workspaces
  - Messages processed
  - Conversations created
  - Lead conversions
```

### Infrastructure Metrics

```yaml
Database:
  - Connection count
  - Query execution time
  - Table sizes
  - Index usage
  - Replication lag

API:
  - Request rate
  - Response time
  - Error rate (4xx, 5xx)
  - Rate limit hits

LLM:
  - Tokens consumed
  - API latency
  - Cost per workspace
  - Error rate
```

---

## 🚨 Alerting Rules

### Critical Alerts (Immediate Action)

```yaml
1. Database down:
   Condition: No successful connections in 1 minute
   Action: SMS + Email + Slack

2. High error rate:
   Condition: >20% errors in 5 minutes
   Action: Email + Slack

3. LLM API failure:
   Condition: All LLM calls failing
   Action: Email + fallback mode

4. Data leak detected:
   Condition: Cross-workspace data access
   Action: SMS + Email + Auto-disable
```

### Warning Alerts (Review Soon)

```yaml
1. Slow queries:
   Condition: >50% queries >1s latency
   Action: Email daily digest

2. High token usage:
   Condition: >$100 LLM cost per day
   Action: Slack notification

3. Low cache hit rate:
   Condition: <50% hit rate
   Action: Email weekly

4. Unused indexes:
   Condition: Index not used in 7 days
   Action: Email weekly
```

---

## 🛠️ Performance Testing

### Load Testing n8n Workflows

```bash
# Using Apache Bench
ab -n 1000 -c 10 \
  -H "Content-Type: application/json" \
  -p payload.json \
  https://n8n.../webhook/ETAPA_03_RAG_Hibrido

# Analyze results:
# - Requests per second
# - Mean latency
# - P95/P99 latency
# - Error rate
```

### Database Load Testing

```sql
-- Simulate concurrent FAQs queries
DO $$
DECLARE
  i INT;
BEGIN
  FOR i IN 1..100 LOOP
    PERFORM match_documents(
      ARRAY_FILL(random(), ARRAY[1536])::vector,
      5,
      '{}'::jsonb
    );
  END LOOP;
END $$;
```

---

## 💰 Cost Optimization

### LLM Cost Reduction

```yaml
1. Use cheaper models where possible:
   - Classification: gemini-flash
   - RAG retrieval: gemini-flash
   - Complex reasoning: gpt-4o (only when needed)

2. Reduce context window:
   - Memory: contextWindowLength: 10 (not 50)
   - System prompt: Keep under 500 tokens

3. Cache embeddings:
   - Store in knowledge_base (don't regenerate)
   - Reuse across queries

4. Batch requests:
   - Process multiple items per LLM call
```

### Database Cost Reduction

```yaml
1. Archive old data:
  - Move logs older than 30 days to archive table
  - Use partitioning for large tables

2. Optimize indexes:
  - Remove unused indexes
  - Use partial indexes where appropriate

3. Compress historical data:
  - Use JSONB compression
  - Archive to cold storage (S3)
```

---

## 📋 Performance Audit Checklist

**Database:**

- [ ] All queries use indexes
- [ ] No N+1 query patterns
- [ ] Connection pooling configured
- [ ] Slow query log reviewed
- [ ] Table sizes monitored

**n8n:**

- [ ] Parallel execution where possible
- [ ] No duplicate HTTP calls
- [ ] Caching implemented
- [ ] Error handling present
- [ ] Execution times logged

**LLM:**

- [ ] Using cheapest model that works
- [ ] Context window minimized
- [ ] Embeddings cached
- [ ] Temperature optimized
- [ ] Token usage tracked

**Monitoring:**

- [ ] Metrics dashboard created
- [ ] Alerting rules configured
- [ ] Logs structured and queryable
- [ ] Error tracking implemented
- [ ] Cost monitoring active

---

## 🎯 Performance Targets

### Latency Targets

```yaml
Sync Workflows (user-facing):
  - P50: <500ms
  - P95: <2s
  - P99: <5s

Async Workflows (background):
  - P50: <5s
  - P95: <30s
  - P99: <60s

Database Queries:
  - Simple SELECT: <10ms
  - Vector search: <100ms
  - Complex JOIN: <500ms
```

### Availability Targets

```yaml
Production:
  - Uptime: 99.9% (8.76h downtime/year)
  - Error rate: <0.1%
  - Data durability: 99.999%

Monitoring:
  - Metrics retention: 90 days
  - Log retention: 30 days
  - Alert SLA: <5 minutes
```

---

## 🔧 Optimization Tools

**Supabase:**

- pganalyze (query performance)
- pg_stat_statements (query stats)
- pg_badger (log analysis)

**n8n:**

- Execution logs (built-in)
- Workflow duration tracking
- Error rate monitoring

**Infrastructure:**

- Grafana (metrics visualization)
- Sentry (error tracking)
- Datadog (APM)

---

## 💡 Pro Tips

1. **Start lean:** Monitor first, optimize later
2. **Measure before optimizing:** Don't guess bottlenecks
3. **Set SLOs:** Service Level Objectives guide decisions
4. **Automate alerts:** Manual monitoring doesn't scale
5. **Review metrics weekly:** Catch trends early
6. **Budget for monitoring:** 5-10% of infra cost

---

## 🔗 Integration with Other Skills

- Use **N8N Workflow Validator** to catch performance anti-patterns
- Use **Multi-Tenant SQL** for query optimization patterns
- Use **RAG N8N Debugger** for specific RAG performance issues
