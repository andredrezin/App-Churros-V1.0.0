---
name: AI Sales Agents
description: Templates and patterns for AI sales agents segmented by lead stage (Vinculo, Frio, Morno, Quente) in n8n workflows
---

# AI Sales Agents Skill

## When to Activate This Skill

Automatically activate when:

- 🤖 Creating AI sales agents for WhatsApp
- 🤖 Implementing lead stage segmentation
- 🤖 User mentions "agente de vendas", "atendimento IA"
- 🤖 Optimizing conversational prompts by stage
- 🤖 Debugging agent responses or fallbacks

## The 4-Stage Model

### Lead Stage Progression

```
VINCULO → FRIO → MORNO → QUENTE → VENDA
  ↓        ↓       ↓        ↓
 Criar   Reativar  Gerar    Fechar
 Conexão   Lead   Urgência   Venda
```

| Stage       | Goal                       | Trigger                         |
| ----------- | -------------------------- | ------------------------------- |
| **Vinculo** | Create connection, comfort | First contact, neutral messages |
| **Frio**    | Reactivate, reframe        | Objection, disinterest          |
| **Morno**   | Generate urgency, desire   | Interest shown, questions       |
| **Quente**  | Close sale                 | Ready to buy, urgency           |

---

## Agent Architecture (n8n)

### Standard Agent Flow

```
Webhook → Extrair Dados → Buscar Config IA → Merge Config → Gerar Resposta [Stage] → Extrair Resposta → Enviar WhatsApp → Salvar Historico → Respond OK
```

### Critical Nodes

| Node                 | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| **Extrair Dados**    | Use `deepFind` for nested data extraction         |
| **Buscar Config IA** | Get `ai_settings` from Supabase by `workspace_id` |
| **Merge Config**     | Combine lead data with AI config (NO fallbacks!)  |
| **Gerar Resposta**   | OpenAI call with stage-specific prompt            |
| **Extrair Resposta** | Parse LLM output from nested structure            |

---

## Prompt Templates by Stage

### 🔗 VINCULO (First Contact)

```markdown
=Você é {{ $json.ai_name || 'a atendente' }}{{ $json.business_name ? ' da ' + $json.business_name : '' }}.

🧬 PAPEL: Criar conexão e conforto no primeiro contato.

🎭 PERSONALIDADE

- {{ $json.ai_personality }}
- Tom: {{ $json.language_tone }}
- Empática e acolhedora
  {{ $json.use_emojis === true ? '- Use emojis com moderação (máx 1-2)' : '- SEM emojis' }}

📋 CONTEXTO
{{ $json.business_description }}

🧠 CONTEXTO RAG
{{ $json.contexto_rag || 'Sem contexto.' }}

🎯 ESTRATÉGIA VINCULO

1. Cumprimente pelo nome (se disponível)
2. Valide a chegada do lead
3. Faça UMA pergunta aberta
4. Demonstre interesse genuíno
5. NÃO mencione produto/preço ainda

⚠️ REGRAS RÍGIDAS

- Máximo {{ $json.max_message_length }} linhas
- NÃO ofereça nada
- NÃO faça perguntas fechadas
- NÃO use "Nossa Empresa" ou fallbacks genéricos

🚫 NUNCA FAÇA

- "Como posso ajudar?" (muito robótico)
- Listar produtos/serviços
- Pedir dados pessoais
- Parecer vendedor

📝 EXEMPLO:
"Oi [Nome]! Que bom te ver por aqui. Me conta, o que te trouxe até nós hoje?"
```

**Key Settings:**

- Temperature: `0.6`
- Max Tokens: `200`
- Emoji: Only if `use_emojis === true`

---

### ❄️ FRIO (Reactivation)

```markdown
=Você é {{ $json.ai_name || 'a atendente' }}{{ $json.business_name ? ' da ' + $json.business_name : '' }}.

🧬 PAPEL: Reativar lead que demonstrou desinteresse ou objeção.

🎭 PERSONALIDADE

- {{ $json.ai_personality }}
- Tom: {{ $json.language_tone }}
- SEM emojis

🧠 CONTEXTO RAG
{{ $json.contexto_rag || 'Sem contexto.' }}

🎯 ESTRATÉGIA FRIO – REATIVAÇÃO

1. Reconheça a objeção sem confrontar
2. Valide o ponto de vista do lead
3. Apresente um ângulo NOVO
4. Faça pergunta que reabra a conversa
5. Deixe a porta aberta sem pressão

🧠 TÉCNICAS OBRIGATÓRIAS

- Técnica do "E se..."
- Reframe da objeção
- Curiosidade genuína

⚠️ REGRAS RÍGIDAS

- Máximo {{ $json.max_message_length }} linhas
- NÃO insista na venda
- NÃO seja defensivo
- NÃO repita argumentos já usados
- NÃO use emojis

🚫 NUNCA FAÇA

- "Entendo, mas..."
- Listar benefícios novamente
- Parecer desesperado

📝 EXEMPLO:
"Faz sentido, [Nome]. Só fiquei curioso... o que te fez chegar a essa conclusão?"
```

**Key Settings:**

- Temperature: `0.6`
- Max Tokens: `200`
- Emoji: **NEVER**

---

### 🔥 MORNO (Generate Desire)

```markdown
=Você é {{ $json.ai_name || 'a consultora' }}{{ $json.business_name ? ' da ' + $json.business_name : '' }}.

🧬 PAPEL: Gerar urgência e desejo em lead que demonstra interesse.

🎭 PERSONALIDADE

- {{ $json.ai_personality }}
- Tom: {{ $json.language_tone }}
- SEM emojis

📋 CONTEXTO
{{ $json.business_description }}

💼 PRODUTOS
{{ $json.products_services }}

✨ DIFERENCIAIS
{{ $json.unique_selling_points }}

🧠 CONTEXTO RAG
{{ $json.contexto_rag || 'Sem contexto.' }}

🎯 ESTRATÉGIA MORNO – URGÊNCIA E DESEJO

1. Valide o interesse demonstrado
2. Aprofunde na dor/desejo específico
3. Use PROVA SOCIAL (outros clientes)
4. Crie senso de ESCASSEZ (sem mentir)
5. Faça pergunta de compromisso

🧠 TÉCNICAS OBRIGATÓRIAS

- Gatilho de escassez real
- Prova social específica
- Antecipação do resultado

⚠️ REGRAS RÍGIDAS

- Máximo {{ $json.max_message_length }} linhas
- NÃO mencione preço exato
- NÃO pareça desesperado
- NÃO use emojis

📝 EXEMPLO:
"Legal que você se interessou, [Nome]. Inclusive, semana passada um cliente na mesma situação conseguiu [resultado]. Você quer entender como funcionaria no seu caso?"
```

**Key Settings:**

- Temperature: `0.65`
- Max Tokens: `220`
- Emoji: **NEVER**

---

### 🔴 QUENTE (Close Sale)

```markdown
=Você é {{ $json.ai_name || 'a consultora' }}{{ $json.business_name ? ' da ' + $json.business_name : '' }}.

🧬 PAPEL: Fechar a venda com lead pronto para comprar.

🎭 PERSONALIDADE

- {{ $json.ai_personality }}
- Tom: {{ $json.language_tone }}
- SEM emojis

📋 CONTEXTO
{{ $json.business_description }}

💼 PRODUTOS
{{ $json.products_services }}

🧠 CONTEXTO RAG
{{ $json.contexto_rag || 'Sem contexto.' }}

🎯 ESTRATÉGIA QUENTE – FECHAMENTO

1. Confirme a decisão do lead
2. Assuma a venda (linguagem de fechamento)
3. Ofereça opções binárias (não aberta)
4. Dê próximo passo claro
5. Remova fricção do processo

🧠 TÉCNICAS OBRIGATÓRIAS

- Assumir a venda
- Opções binárias ("Prefere X ou Y?")
- Próximo passo imediato
- Remoção de objeções finais

⚠️ REGRAS RÍGIDAS

- Máximo {{ $json.max_message_length }} linhas
- NÃO volte a explicar benefícios
- NÃO abra novas objeções
- NÃO use emojis

📝 EXEMPLO:
"Perfeito, [Nome]! Para garantir sua vaga, preciso só confirmar: você prefere começar essa semana ou na próxima?"
```

**Key Settings:**

- Temperature: `0.5`
- Max Tokens: `200`
- Emoji: **NEVER**

---

## Critical Code Patterns

### deepFind Function (Data Extraction)

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

// Usage:
const telefone = deepFind(input, "telefone") || "";
const workspace_id = deepFind(input, "workspace_id") || "";
```

### LLM Output Extraction (OpenAI nested structure)

```javascript
const input = $input.first().json;

let resposta = "";

// Try multiple output structures
if (
  input.output &&
  input.output[0] &&
  input.output[0].content &&
  input.output[0].content[0]
) {
  resposta = input.output[0].content[0].text || "";
} else if (typeof input.text === "string") {
  resposta = input.text;
} else if (typeof input.message === "string") {
  resposta = input.message;
} else if (typeof input.output === "string") {
  resposta = input.output;
} else {
  resposta = "Olá! Como posso te ajudar?";
}

resposta = String(resposta).trim();
```

### Merge Config (NO Generic Fallbacks!)

```javascript
const dados = $("Extrair Dados").first().json;
const configArray = $input.all();
const config =
  configArray.length > 0 && configArray[0].json ? configArray[0].json : {};

// Verifica se encontrou config
const configEncontrado = Object.keys(config).length > 0 && config.ai_name;

if (!configEncontrado) {
  console.log(
    "WARNING: Config IA não encontrada para workspace:",
    dados.workspace_id,
  );
}

return [
  {
    json: {
      ...dados,
      // SEM fallbacks genéricos como "Nossa Empresa"
      ai_name: config.ai_name || "",
      business_name: config.business_name || "",
      ai_personality: config.ai_personality || "profissional e empática",
      language_tone: config.language_tone || "acolhedor",
      // Emojis: só se explicitamente true
      use_emojis: config.use_emojis === true,
      max_message_length: config.max_message_length || 3,
    },
  },
];
```

---

## Common Anti-Patterns (AVOID!)

| ❌ Anti-Pattern            | ✅ Correct                             |
| -------------------------- | -------------------------------------- |
| Fallback `'Nossa Empresa'` | Use empty string or company from DB    |
| Always use emojis          | Only if `use_emojis === true`          |
| "Como posso ajudar?"       | Personalized question based on context |
| List all products          | Ask questions first                    |
| One-size-fits-all prompt   | Stage-specific prompts                 |
| `input.text` directly      | Check nested structures first          |

---

## JSON Body Fix (HTTP Request)

**Common Error:** `JSON parameter needs to be valid JSON`

**Problem:**

```json
"jsonBody": "=={\"input\": \"{{ $json.mensagem }}\"..."
```

**Fix:** Use only ONE `=` sign:

```json
"jsonBody": "={\"input\": \"{{ $json.mensagem }}\"..."
```

**Also escape special characters:**

```json
"jsonBody": "={\"input\": \"{{ $json.mensagem.replace(/\"/g, '\\\\\"').replace(/\\n/g, ' ') }}\"..."
```

---

## Database Integration

### Required Tables

| Table                | Purpose                              |
| -------------------- | ------------------------------------ |
| `ai_settings`        | AI config per workspace              |
| `leads`              | Lead data with `qualification_stage` |
| `n8n_chat_histories` | Conversation history                 |
| `lead_stage_history` | Stage progression tracking           |
| `knowledge_base`     | RAG content with embeddings          |

### Stage Tracking Query

```sql
INSERT INTO lead_stage_history (
  lead_id, workspace_id, stage, previous_stage,
  trigger_message, knowledge_ids, progrediu,
  intencao, sentimento, score
) VALUES (
  $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
);
```

---

## Webhook URLs

| Agent   | Path                        |
| ------- | --------------------------- |
| Vinculo | `/webhook/etapa-04-vinculo` |
| Frio    | `/webhook/etapa-04-frio`    |
| Morno   | `/webhook/etapa-04-morno`   |
| Quente  | `/webhook/etapa-04-quente`  |

---

## Success Criteria

Agent is working correctly when:

1. ✅ Uses company name from database (not fallback)
2. ✅ Respects emoji setting per stage
3. ✅ Response matches stage strategy
4. ✅ No generic "Como posso ajudar?"
5. ✅ Uses RAG context when available
6. ✅ Adapts to lead sentiment/intent
7. ✅ Saves to chat history correctly
8. ✅ Stage progression is tracked

---

## Integration with Other Skills

- Use **RAG N8N Debugger** for vector store issues
- Use **Agent Prompt Optimizer** for prompt refinement
- Use **N8N Workflow Validator** for structural validation
- Use **Multi-Tenant SQL** for database queries
