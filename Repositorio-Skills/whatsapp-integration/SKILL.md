---
name: WhatsApp Integration Patterns
description: Best practices for Evolution API integration, webhook handling, and message processing in multi-tenant n8n workflows
---

# WhatsApp Integration Patterns Skill

## When to Activate This Skill

Automatically activate when:

- 💬 Integrating Evolution API with n8n
- 💬 Processing WhatsApp webhooks
- 💬 Handling message types (text, audio, image, document)
- 💬 Implementing conversation flow
- 💬 Debugging webhook failures

## Evolution API Architecture

### 🏗️ Core Components

```yaml
Evolution API:
  - Instance management (per workspace)
  - Webhook events
  - Message sending
  - Media handling
  - QR code generation

n8n Workflows:
  - Webhook receivers (ETAPA_01: Ingestion)
  - Message processors (ETAPA_02, 03, ...04)
  - Response senders

Supabase:
  - Conversation storage
  - Lead tracking
  - Message history
```

---

## 📥 Webhook Payload Structures

### Standard Message Received

```json
{
  "event": "messages.upsert",
  "instance": "ws_4f2e7764_1766891265259",
  "data": {
    "key": {
      "remoteJid": "553599444388@s.whatsapp.net",
      "fromMe": false,
      "id": "3EB027117A97AC5E486DD9"
    },
    "pushName": "Andre Domingos",
    "message": {
      "conversation": "Olá, quero saber mais sobre os produtos"
    },
    "messageTimestamp": 1767301767
  }
}
```

### Audio Message

```json
{
  "message": {
    "audioMessage": {
      "url": "https://...",
      "mimetype": "audio/ogg; codecs=opus",
      "seconds": 10
    }
  }
}
```

### Image Message

```json
{
  "message": {
    "imageMessage": {
      "url": "https://...",
      "mimetype": "image/jpeg",
      "caption": "Veja essa foto"
    }
  }
}
```

---

## 🛠️ Extraction Patterns

### Pattern 1: Safe Field Extraction

```javascript
// In Set node "organiza-dados"

// ❌ UNSAFE (fails if structure changes)
telefone: {
  {
    $json.data.key.remoteJid;
  }
}

// ✅ SAFE (handles missing fields)
telefone: {
  {
    $json.data?.key?.remoteJid?.replace("@s.whatsapp.net", "") || "unknown";
  }
}

mensagem: {
  {
    $json.data.message?.conversation ||
      $json.data.message?.extendedTextMessage?.text ||
      "[mídia]";
  }
}

pushName: {
  {
    $json.data?.pushName || "Sem nome";
  }
}
```

---

### Pattern 2: Message Type Detection

```javascript
// In IF node or Code node

const message = $json.data.message;

const messageType = message.conversation
  ? "text"
  : message.extendedTextMessage
    ? "text"
    : message.imageMessage
      ? "image"
      : message.audioMessage
        ? "audio"
        : message.documentMessage
          ? "document"
          : message.videoMessage
            ? "video"
            : "unknown";

return { messageType };
```

---

## 📤 Sending Messages

### Pattern 1: Send Text Message

```javascript
// HTTP Request node
POST https://evo-api.../message/sendText/{instance}

Headers:
  apikey: {{ $json.apikey }}
  Content-Type: application/json

Body:
{
  "number": "{{ $json.telefone }}",
  "textMessage": {
    "text": "{{ $json.resposta }}"
  }
}
```

---

### Pattern 2: Send with Mention

```javascript
{
  "number": "{{ $json.telefone }}",
  "textMessage": {
    "text": "@{{ $json.pushName }}, aqui está sua resposta..."
  },
  "options": {
    "delay": 1000
  }
}
```

---

### Pattern 3: Send Media (Image)

```javascript
POST /message/sendMedia/{instance}

{
  "number": "{{ $json.telefone }}",
  "mediaMessage": {
    "mediatype": "image",
    "media": "https://example.com/image.jpg",
    "caption": "Confira nosso catálogo!"
  }
}
```

---

## 🔄 Conversation Flow Patterns

### Pattern 1: Linear Flow (Simple)

```
Webhook → Extract → Process → Respond
```

**Use for:** Simple Q&A, FAQ bots

---

### Pattern 2: Stateful Flow (Context-Aware)

```
Webhook → Load Conversation → Process with Context → Update State → Respond
```

**Implementation:**

```sql
-- Get last N messages
SELECT
  role,  -- 'user' | 'assistant'
  content,
  created_at
FROM messages
WHERE conversation_id = $1
ORDER BY created_at DESC
LIMIT 10;

-- Format as chat_history string
Lead: "mensagem 1"
Marcela: "resposta 1"
Lead: "mensagem 2"
...
```

---

### Pattern 3: Multi-Stage Flow (Agent Routing)

```
ETAPA_01: Ingestion
  ↓
ETAPA_02: Media Processing (if audio/image)
  ↓
ETAPA_03: RAG Retrieval
  ↓
ETAPA_04: Agent Selection (Frio/Morno/Quente)
  ↓
ETAPA_05: Response Generation
  ↓
Send to WhatsApp
```

**Data passed between stages:**

```json
{
  "telefone": "553599444388",
  "mensagem": "texto processado",
  "workspace_id": "uuid",
  "conversation_id": "uuid",
  "lead_id": "uuid",
  "chat_history": "string",
  "rag_context": [...],
  "segment": "quente",
  "intent": "compra"
}
```

---

## 🎯 Multi-Tenant Instance Management

### Pattern: One Instance Per Workspace

```javascript
// Instance naming convention
instance_name = `ws_${workspace_id}_${timestamp}`;

// Example:
("ws_4f2e7764_1766891265259");
```

**Benefits:**

- ✅ Isolated WhatsApp numbers per client
- ✅ Independent QR codes
- ✅ Easier billing tracking
- ✅ Workspace-specific webhooks

**Store mapping:**

```sql
CREATE TABLE whatsapp_instances (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  instance_name TEXT UNIQUE,
  phone_number TEXT,
  qr_code TEXT,
  status TEXT,  -- 'active' | 'disconnected'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🔒 Security Patterns

### Validate Webhook Source

```javascript
// In Webhook node or Code node
const receivedApiKey = $json.headers["x-api-key"];
const validApiKey = "1F681DF7-90EE-43C1-B122-A4277BDFB642";

if (receivedApiKey !== validApiKey) {
  throw new Error("Invalid API key");
}

// Also validate instance belongs to workspace
const instance = $json.instance;
const workspace = await getWorkspaceByInstance(instance);

if (!workspace) {
  throw new Error("Unknown instance");
}
```

---

## 🐛 Debugging Patterns

### Pattern 1: Log All Webhooks

```javascript
// At start of ETAPA_01 (Ingestion)
INSERT INTO webhook_logs (
  workspace_id,
  event_type,
  payload,
  created_at
) VALUES (
  $1,
  $json.event,
  $json::jsonb,
  NOW()
);

// Retention: 7 days
DELETE FROM webhook_logs
WHERE created_at < NOW() - INTERVAL '7 days';
```

---

### Pattern 2: Test Webhook Manually

```bash
# Send test webhook to n8n
curl -X POST https://n8n.../webhook/ETAPA_01_Ingestion \
  -H "Content-Type: application/json" \
  -d '{
    "event": "messages.upsert",
    "instance": "test_instance",
    "data": {
      "key": {"remoteJid": "5535999999999@s.whatsapp.net"},
      "pushName": "Test User",
      "message": {"conversation": "test message"}
    }
  }'
```

---

### Pattern 3: Simulate Stages

```json
// Pin data in n8n to test ETAPA_03 without ETAPA_01/02
{
  "body": {
    "telefone": "553599444388",
    "mensagem": "Quanto custa?",
    "workspace_id": "4f2e7764-d713-4a19-a7ef-b6bda4f960dd",
    "conversation_id": "test-conv-001",
    "chat_history": ""
  }
}
```

---

## 📊 Message Handling Best Practices

### Handle fromMe Messages

```javascript
// Skip messages sent BY the bot (avoid loops)
if ($json.data.key.fromMe === true) {
  return []; // n8n: empty array = stop execution
}
```

---

### Handle Group Messages

```javascript
// Skip group messages (or handle differently)
const isGroup = $json.data.key.remoteJid.endsWith("@g.us");

if (isGroup) {
  // Option 1: Skip
  return [];

  // Option 2: Handle with group logic
  // Extract group ID, mentioned user, etc.
}
```

---

### Rate Limiting

```javascript
// Prevent spam (max 1 message per user per 5 seconds)
const recentMessage = await db.query(
  `
  SELECT * FROM messages
  WHERE telefone = $1 
    AND created_at > NOW() - INTERVAL '5 seconds'
  LIMIT 1
`,
  [$json.telefone],
);

if (recentMessage.length > 0) {
  return []; // Ignore spam
}
```

---

## 🎨 Response Formatting

### Pattern 1: Structured Response

```javascript
// Instead of plain text:
"O preço é R$ 299";

// Use formatting:
"💰 *Preço Promocional*\n\nPlano Premium: R$ 299/mês\n\n✅ Acesso ilimitado\n✅ Suporte 24/7\n\nQuer saber mais?";
```

**WhatsApp Markdown:**

- `*bold*` → **bold**
- `_italic_` → _italic_
- `~strike~` → ~~strike~~
- `code` → `code`

---

### Pattern 2: Emojis for Clarity

```
✅ Confirmação
❌ Erro
⏳ Processando
💬 Mensagem
📞 Contato
📦 Produto
💰 Preço
🎯 Oferta
```

---

### Pattern 3: Line Breaks for Readability

```javascript
// BAD: Wall of text
"Olá! Temos 3 planos: Básico R$99, Premium R$299, Enterprise sob consulta. Todos incluem suporte 24/7.";

// GOOD: Structured
"Olá! 👋\n\nTemos 3 planos disponíveis:\n\n📦 *Básico* - R$ 99/mês\n📦 *Premium* - R$ 299/mês\n📦 *Enterprise* - Sob consulta\n\nTodos incluem suporte 24/7! ✅";
```

---

## 🔄 Retry & Error Handling

### Pattern: Exponential Backoff for Sending

```javascript
// In HTTP Request node settings:
Retry on Fail: true
Max Retries: 3
Retry Interval: 1000ms (exponential)

// Or custom retry logic:
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    await sendWhatsAppMessage(...);
    break;  // Success
  } catch (error) {
    if (attempt === 3) throw error;  // Last attempt failed
    await sleep(1000 * attempt);  // 1s, 2s, 3s
  }
}
```

---

## 📋 Webhook Event Types

### Events to Handle

```yaml
messages.upsert: # New message received
  Action: Process message

messages.update: # Message status changed (sent/delivered/read)
  Action: Update message status in DB

connection.update: # WhatsApp connection status
  Action: Log, notify admin if disconnected

qr.updated: # New QR code generated
  Action: Update QR in database, show to user

chats.upsert: # New chat created
  Action: Create conversation record
```

---

## 🎯 Performance Optimization

### Webhook Response Time

```javascript
// CRITICAL: Respond to webhook FAST (<1s)
// Don't do heavy processing in webhook handler

// ❌ BAD: Process in webhook
Webhook → Extract → RAG (2s) → Agent (3s) → Respond

// ✅ GOOD: Queue and process async
Webhook → Validate → Insert to Queue → Response 200 OK (100ms)
                         ↓
                    Background Worker → RAG → Agent → Send WhatsAppp
```

**Implementation:**

```sql
-- Queue table
CREATE TABLE message_queue (
  id UUID PRIMARY KEY,
  workspace_id UUID,
  payload JSONB,
  status TEXT,  -- 'pending' | 'processing' | 'completed' | 'failed'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook inserts to queue
INSERT INTO message_queue (workspace_id, payload, status)
VALUES ($1, $2, 'pending');

-- Background workflow polls queue
SELECT * FROM message_queue
WHERE status = 'pending'
ORDER BY created_at
LIMIT 10;
```

---

## 🔗 Integration with Skills

- Use **N8N Workflow Validator** to validate webhook workflows
- Use **Multi-Tenant SQL** for conversation storage queries
- Use **Performance Monitoring** to track message processing latency
- Use **RAG N8N Debugger** if RAG retrieval fails in message context

---

## 💡 Pro Tips

1. **Always validate `fromMe`:** Prevent infinite loops
2. **Log raw webhooks:** Debug payload structure issues
3. **Use instance naming convention:** Easy workspace lookup
4. **Handle media separately:** Audio/images need transcription/OCR
5. **Implement queue for scale:** Don't process in webhook handler
6. **Test with Evolution API sandbox:** Before production deployment
7. **Monitor connection status:** Alert if WhatsApp disconnects
8. **Format responses nicely:** Use emojis, bold, line breaks

---

## 🚨 Common Issues & Fixes

| Issue                  | Cause                      | Fix                                          |
| ---------------------- | -------------------------- | -------------------------------------------- |
| Webhook not triggering | Wrong URL                  | Check n8n webhook URL in Evolution config    |
| Infinite loop          | Bot responds to itself     | Check `fromMe === false`                     |
| Missing messages       | Payload structure changed  | Update extraction logic with safe navigation |
| Media URL expired      | Temporary URL              | Download immediately, store in S3/Supabase   |
| Rate limited           | Too many sends             | Implement queue with rate limiting           |
| QR not generating      | Instance already connected | Disconnect old session first                 |

---

## 📚 Reference: Payload Navigation

```javascript
// Phone number
$json.data.key.remoteJid.replace("@s.whatsapp.net", "");

// Message text (with fallbacks)
$json.data.message?.conversation ||
  $json.data.message?.extendedTextMessage?.text ||
  "[não-texto]";

// Sender name
$json.data?.pushName || "Anônimo";

// Message ID (for deduplication)
$json.data.key.id;

// Timestamp
new Date($json.data.messageTimestamp * 1000).toISOString();

// Instance name
$json.instance;

// Is from bot
$json.data.key.fromMe;
```
