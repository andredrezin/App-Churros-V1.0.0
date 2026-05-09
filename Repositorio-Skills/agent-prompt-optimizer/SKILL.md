---
name: Agent Prompt Optimizer
description: Optimizes LangChain Agent prompts to ensure tool usage, prevent hallucination, and enforce structured outputs
---

# Agent Prompt Optimizer Skill

## When to Activate This Skill

Automatically activate when:

- 🤖 Creating or modifying Agent node prompts
- 🤖 User reports "Agent não usa a ferramenta"
- 🤖 Agent invents answers instead of using tools
- 🤖 Agent ignores available tools
- 🤖 Prompt needs review for production deployment

## Core Principles

### 🧠 The Agent Psychology

**Agents are inherently lazy:**

- They prefer using their base knowledge (faster)
- Tool calls require extra "mental effort" (tokens)
- Vague prompts = escape to hallucination

**Solution:** Make tool usage the path of least resistance

---

## 📐 Optimal Prompt Structure

### The 5-Section Formula (Always Use This)

```markdown
# 1️⃣ IDENTITY (Who you are)

You are [Role], a [specific function] agent.

# 2️⃣ ABSOLUTE RULE (Non-negotiable behavior)

You MUST [action]. You CANNOT [opposite action].

BEFORE any response:

1. [Step 1 - usually tool call]
2. [Step 2 - process]
3. [Step 3 - format output]

# 3️⃣ FORBIDDEN (What NOT to do)

NEVER:

- [Anti-pattern 1]
- [Anti-pattern 2]
- [Anti-pattern 3]

# 4️⃣ INPUT CONTEXT (What you receive)

You receive:

- Variable 1: {{ $json.field1 }}
- Variable 2: {{ $json.field2 }}

# 5️⃣ OUTPUT FORMAT (How to respond)

Return ONLY:
{
"key": "value",
"structure": "defined"
}
```

---

## ✅ Example: Retrieval Agent (RAG Porteiro)

**GOOD Prompt:**

```markdown
# IDENTITY

You are a Retrieval Agent. You have NO intrinsic knowledge.

# ABSOLUTE RULE

BEFORE responding, you MUST:

1. Call tool: `buscar_faqs_empresa`
2. Pass query: "{{ $json.mensagem }}"
3. Wait for results
4. Return ONLY tool results

# FORBIDDEN

NEVER:

- Answer without calling the tool
- Invent information not from tool results
- Use your base knowledge (GPT training data)
- Say "I don't have a tool" (you DO)

# INPUT

Message: {{ $json.mensagem }}
Workspace: {{ $json.workspace_id }}

# OUTPUT

{
"found_items": [...],
"total": 5,
"source": "knowledge_base"
}

# EXAMPLE USAGE

User: "Quanto custa?"
Action: buscar_faqs_empresa(query="Quanto custa?")
Output: {"found_items": [{"content": "Preço: R$299"}]}
```

**BAD Prompt (Anti-patterns):**

```markdown
❌ "You are a helpful assistant."
(Too generic, falls back to base knowledge)

❌ "Use the tool if needed."
(Escape hatch! Agent will skip tool)

❌ "Search the knowledge base for answers."
(Not imperative enough, no step-by-step)

❌ No example provided
(Agent doesn't know HOW to use tool)
```

---

## 🎯 Role-Specific Templates

### Template 1: Tool-Only Agent (RAG, Search)

```markdown
# MODE: TOOL-ONLY RETRIEVAL

You are a [Tool Name] agent. You CANNOT answer questions yourself.

# WORKFLOW (MANDATORY)

Step 1: Receive query from user
Step 2: Call tool `[tool_name]` with query
Step 3: Return tool results verbatim
Step 4: STOP (do not add commentary)

# FORBIDDEN

- ❌ Answering from memory
- ❌ Saying "I don't know" (use tool first!)
- ❌ Paraphrasing tool results

# INPUT

{{ $json.user_query }}

# ACTION

Call: [tool_name](query="{{ $json.user_query }}")

# OUTPUT

Exact tool response, no additions.
```

---

### Template 2: Decision Agent (Router, Classifier)

```markdown
# IDENTITY

You are a Lead Qualifier. You classify leads into segments.

# TASK

Analyze input and return ONLY classification:

- Segment: "frio" | "morno" | "quente"
- Urgency: "baixa" | "media" | "alta"
- Intent: "compra" | "duvida" | "suporte"

# RULES

1. MUST return JSON below (nothing else)
2. MUST set ALL 3 fields
3. CANNOT ask questions back

# INPUT

Message: {{ $json.mensagem }}
History: {{ $json.chat_history }}

# OUTPUT (JSON ONLY)

{
"segment": "...",
"urgency": "...",
"intent": "...",
"reason": "max 10 words"
}

# EXAMPLES

Input: "Preciso URGENTE!"
Output: {"segment":"quente","urgency":"alta","intent":"compra","reason":"urgência explícita"}
```

---

### Template 3: Conversational Agent (Customer-facing)

```markdown
# IDENTITY

You are Marcela, a sales assistant for [Company].

# PERSONALITY

- Friendly but professional
- Concise (max 2 paragraphs)
- Uses first name if provided

# TOOLS AVAILABLE

1. `buscar_faqs`: Search company knowledge
2. `consultar_estoque`: Check product availability

# WORKFLOW

1. Understand user intent
2. IF question about company/product → Call `buscar_faqs`
3. IF question about availability → Call `consultar_estoque`
4. Format response naturally using tool results
5. NEVER invent product details

# FORBIDDEN

- ❌ Making up prices
- ❌ Promising features not in FAQ
- ❌ Answering technical questions without tools

# INPUT

Message: {{ $json.mensagem }}
Name: {{ $json.pushName }}

# RESPONSE STYLE

"Oi [Name]! [Answer using tool results]. [Call to action]."
```

---

## 🚨 Anti-Pattern Detector

### Red Flags in Prompts (Fix Immediately)

| ❌ Anti-Pattern               | ✅ Fix                           |
| ----------------------------- | -------------------------------- |
| "You are a helpful assistant" | "You are a [specific role]"      |
| "Use tools if needed"         | "You MUST use [tool_name]"       |
| "Try to answer"               | "ONLY answer using tool results" |
| No example provided           | Add 2-3 tool usage examples      |
| Vague output format           | Specify exact JSON schema        |
| "You can..."                  | "You MUST..."                    |
| Temperature > 0.5             | Lower to 0.2-0.3                 |

---

## 🔧 Prompt Optimization Checklist

Before deploying an Agent prompt:

**Structure:**

- [ ] Has clear Identity section
- [ ] Has Absolute Rule with steps
- [ ] Has Forbidden section
- [ ] Has Input variable references
- [ ] Has Output format specification

**Tool Enforcement:**

- [ ] Explicitly names tools to use
- [ ] Shows example tool call syntax
- [ ] Forbids answering without tools
- [ ] No "if needed" or "you can" escape hatches

**Technical:**

- [ ] Variables use `{{ $json.field }}` syntax
- [ ] References correct node names
- [ ] JSON output schema is valid
- [ ] Temperature set to ≤ 0.3

**Testing:**

- [ ] Test with query that should trigger tool
- [ ] Check Agent logs for tool call confirmation
- [ ] Verify Agent doesn't answer without tool
- [ ] Test with ambiguous query (should still use tool)

---

## 🧪 Testing Agent Behavior

### Test Case 1: Tool Usage Verification

```javascript
// In n8n Agent node, check Logs tab
// Look for this pattern:

✅ CORRECT:
"Calling tool: buscar_faqs_empresa"
"Tool arguments: { query: 'quanto custa' }"
"Tool result: [...]"

❌ INCORRECT:
"Final answer: Let me help you..."
(No tool call = failed prompt)
```

### Test Case 2: Hallucination Prevention

```javascript
// Ask about something NOT in knowledge base
Query: "Vocês vendem carros?"

✅ CORRECT:
Agent calls tool → Tool returns [] → Agent says "Não encontrei"

❌ INCORRECT:
Agent says "Não vendemos carros" (invented answer!)
```

---

## 📊 Temperature Guidelines by Agent Type

| Agent Type                  | Temperature | Reasoning                     |
| --------------------------- | ----------- | ----------------------------- |
| Retrieval-Only              | 0.0 - 0.2   | Zero creativity needed        |
| Classifier/Router           | 0.1 - 0.3   | Deterministic categorization  |
| Conversational (with tools) | 0.3 - 0.5   | Natural language + tool usage |
| Creative Writer             | 0.7 - 0.9   | Only if NO tools involved     |

**Rule of Thumb:** Lower temp = more tool usage

---

## 🎨 Personality vs Functionality Balance

### When Agent Needs Personality (Customer-facing):

```markdown
# PERSONALITY

- Tone: [friendly/professional/casual]
- Style: [concise/detailed]
- Emoji: [yes/no]

# BUT STILL ENFORCE TOOLS

You MUST use tools for facts. Personality applies ONLY to:

- Greetings
- Transitions between tool results
- Closing statements

NEVER apply personality to:

- Product details (only from tools)
- Prices (only from tools)
- Technical specs (only from tools)
```

---

## 💡 Advanced Techniques

### Technique 1: Chain of Thought (for complex reasoning)

```markdown
# Before responding, think step-by-step:

Step 1: What is the user asking?
Step 2: Which tool(s) can answer this?
Step 3: Call tool(s)
Step 4: How do results answer the question?
Step 5: Format response

YOU MUST show this reasoning in your response.
```

### Technique 2: Self-Critique Loop

```markdown
After draft response:

1. Did I call all necessary tools?
2. Did I invent ANY information?
3. Is my answer ONLY from tool results?

If ANY answer is "no", retry.
```

### Technique 3: Constrained Output (Force JSON)

```markdown
# OUTPUT RULES

1. You MUST return JSON
2. You CANNOT return plain text
3. Invalid JSON = automatic failure

Schema:
{
"tool_used": "string",
"result": "object",
"confidence": "number 0-1"
}
```

---

## 🔄 Prompt Iteration Process

### Version 1 (Initial)

```
"Use buscar_faqs to answer questions."
```

Result: Agent ignores tool 80% of the time ❌

### Version 2 (Add imperative)

```
"You MUST use buscar_faqs for all questions."
```

Result: Agent uses tool 50% of the time ⚠️

### Version 3 (Add steps + forbid escape)

```
"BEFORE answering:
1. Call buscar_faqs
2. Return results
FORBIDDEN: Answering without tool"
```

Result: Agent uses tool 90% of the time ✅

### Version 4 (Add example + lower temp)

```
[Version 3 + example tool call + temp=0.2]
```

Result: Agent uses tool 99% of the time ⭐

---

## 🎯 Success Metrics

Prompt is optimized when:

1. ✅ Tool usage rate > 95% (check logs)
2. ✅ Zero hallucinated facts in testing
3. ✅ Consistent output format (all responses match schema)
4. ✅ No "I don't know" when tool has answer
5. ✅ No invented details when tool returns empty

---

## 📚 Reference: Prompt Keywords Power Ranking

**High-Power (Use these):**

- MUST, NEVER, ALWAYS, FORBIDDEN
- "Before responding", "Step 1/2/3"
- "ONLY", "Exactly", "Precisely"
- "Call tool: [name]"

**Medium-Power (Use sparingly):**

- "Should", "Prefer", "Ideally"
- "When possible"
- "Consider using"

**Low-Power (Avoid):**

- "If needed", "You can", "Try to"
- "Helpful", "Assistant"
- "Feel free to"

---

## 🆕 Sales Agent Prompt Patterns

### Stage-Specific Prompt Structure

For AI sales agents, prompts must adapt to lead stage:

| Stage       | Focus        | Emoji                       | Tone                   |
| ----------- | ------------ | --------------------------- | ---------------------- |
| **Vinculo** | Connection   | Optional (if config allows) | Warm, welcoming        |
| **Frio**    | Reactivation | NEVER                       | Curious, non-defensive |
| **Morno**   | Urgency      | NEVER                       | Consultive, persuasive |
| **Quente**  | Closing      | NEVER                       | Confident, direct      |

### Emoji Control Pattern

```markdown
# In prompt (dynamic)

{{ $json.use_emojis === true ? '- Use emojis com moderação (máx 1-2)' : '- SEM emojis' }}

# In Merge Config node

use_emojis: config.use_emojis === true // Only true if EXPLICITLY true
```

### Anti-Patterns in Sales Agents

| ❌ Anti-Pattern            | ✅ Fix                                     |
| -------------------------- | ------------------------------------------ | ---------------- | --------------------------------- |
| `business_name             |                                            | 'Nossa Empresa'` | Use empty string or fetch from DB |
| "Como posso ajudar?"       | Ask personalized question based on context |
| Emojis in all stages       | Only Vinculo (if enabled)                  |
| Same prompt for all stages | Stage-specific strategies                  |
| Ignoring sentiment/intent  | Adapt response to lead's emotional state   |

### Sales Agent Prompt Template

```markdown
=Você é {{ $json.ai_name || 'a atendente' }}{{ $json.business_name ? ' da ' + $json.business_name : '' }}.

🧬 PAPEL: [Stage-specific goal]

🎭 PERSONALIDADE

- {{ $json.ai_personality }}
- Tom: {{ $json.language_tone }}
  {{ $json.use_emojis === true ? '- Use emojis com moderação' : '- SEM emojis' }}

🧠 CONTEXTO RAG
{{ $json.contexto_rag || 'Sem contexto.' }}

🎯 ESTRATÉGIA [STAGE]
[Stage-specific techniques]

⚠️ REGRAS RÍGIDAS

- Máximo {{ $json.max_message_length }} linhas
- NÃO use fallbacks genéricos
  [Stage-specific rules]

💡 ADAPTAÇÃO
{{ $json.sentimento === 'Negativo' ? '- Lead frustrado: valide primeiro' : '' }}
{{ $json.intencao === 'comprar' ? '- Lead decidido: facilite próximo passo' : '' }}

📝 EXEMPLO:
[Stage-specific example response]
```

---

## 🔗 Integration with Other Skills

- Use with **RAG N8N Debugger** to diagnose tool call failures
- Use with **Multi-Tenant SQL** to document tool behavior expectations
- Use with **AI Sales Agents** for stage-specific prompt templates
- Prompts should reference tools created via SQL templates

---

## ⚠️ Common Mistakes & Fixes

**Mistake:** "Agente às vezes usa ferramenta, às vezes não"
**Fix:** Remove ALL "if needed" language + lower temperature to 0.2

**Mistake:** "Agente retorna texto, não JSON"
**Fix:** Add "You CANNOT return plain text. JSON only."

**Mistake:** "Agente mistura conhecimento dele com da ferramenta"
**Fix:** Add "You have NO intrinsic knowledge. ALL answers from tools."

**Mistake:** "Prompt muito longo, agente se confunde"
**Fix:** Use 5-section formula. Max 30 lines. Sections with # headers.

---

## 💎 Pro Tips

1. **Test prompt with dumb queries:** "asdfgh" should still trigger tool
2. **Version control prompts:** Keep history of what worked
3. **A/B test temperatures:** 0.2 vs 0.3 can make huge difference
4. **Read Agent logs religiously:** They show agent's "thoughts"
5. **Iterate 3-5 times:** First prompt rarely perfect
6. **Copy examples from working agents:** Steal what works

---

## 🎓 Prompt Templates by Use Case

### Use Case: RAG Porteiro (Current Project)

See "Template 1: Tool-Only Agent"

### Use Case: Lead Qualifier

See "Template 2: Decision Agent"

### Use Case: Customer Support Bot

See "Template 3: Conversational Agent"

### Use Case: Data Analyzer

```markdown
# IDENTITY

You are a Data Analyst agent.

# TASK

Analyze input data and return insights JSON.

# WORKFLOW

1. Call `fetch_data(workspace_id)` tool
2. Analyze results using pandas-style logic
3. Return structured insights

# TOOLS

- fetch_data: Gets raw metrics
- calculate_trends: Computes growth rates

# OUTPUT

{
"total_leads": number,
"growth_rate": number,
"top_segment": string,
"recommendation": string
}
```
