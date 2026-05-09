# Churros Crocantes — POS System

Sistema de ponto de venda para barraca de churros artesanais. Resolve uma exigência da vigilância sanitária: separar quem manuseia dinheiro (caixa) de quem prepara os alimentos (produção).

## Stack

- **Frontend:** React 19 + TanStack Router/Start + TypeScript
- **UI:** Tailwind CSS v4 + Radix UI (shadcn/ui)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Deploy:** Cloudflare Workers via Wrangler
- **Build:** Vite + Bun

## Usuários reais

| Perfil | Quem usa | Dispositivo | Rota |
|---|---|---|---|
| `caixa` | Irmã do André | Celular vertical | `/caixa` |
| `producao` | Pai do André | Tablet/celular deitado | `/producao` |
| `admin` | André | Qualquer | `/admin` |

## Rotas

- `/login` — autenticação, redireciona automaticamente pelo perfil
- `/caixa` — registrar pedidos, carrinho, pagamento
- `/producao` — fila de preparo em tempo real com timer
- `/admin` — dashboard, cardápio, histórico, fechamento de caixa

## Banco de dados (tabelas principais)

```
categorias → produtos → opcoes
pedidos → itens_pedido
user_roles
```

Realtime ativo em: `pedidos`, `itens_pedido`

## Fluxo de pedido

```
Caixa seleciona itens → adiciona ao carrinho → confirma pagamento
→ pedido criado no Supabase → aparece em tempo real na tela de Produção
→ Produção avança status: aguardando → em_preparo → pronto → entregue
```

## Status dos pedidos

`aguardando` → `em_preparo` → `pronto` → `entregue` | `cancelado`

## Métodos de pagamento

`dinheiro` | `pix` | `cartao`

## Arquivos principais

- `src/lib/pos-types.ts` — tipos TypeScript do domínio
- `src/lib/pos.ts` — lógica de negócio (criar pedido, calcular total)
- `src/lib/auth.tsx` — AuthProvider + hook useAuth + RoleGuard
- `src/lib/format.ts` — formatação BRL e número de pedido
- `src/routes/caixa.tsx` — tela do caixa
- `src/routes/producao.tsx` — fila de produção
- `src/routes/admin.tsx` — painel admin
- `src/integrations/supabase/client.ts` — cliente Supabase (browser)
- `src/integrations/supabase/types.ts` — tipos gerados do banco

## Convenções

- Dinheiro sempre em centavos internamente; exibir com `brl()` de `src/lib/format.ts`
- Número do pedido: sequencial por dia, exibir com `padNum()` (ex: #047)
- Autenticação via `useAuth()` — nunca acessar supabase.auth diretamente nas rotas
- Realtime via `supabase.channel()` — sempre chamar `supabase.removeChannel()` no cleanup
- Botões grandes (mínimo h-12), fontes legíveis, poucos passos — ambiente de barraca de rua

## Identidade visual

- Vermelho escuro: `#C0001A` (var `--primary`)
- Dourado: `#F5C300` (class `text-gold`)
- Gradiente da marca: `bg-brand-gradient`
- Fundo escuro: tema dark nativo

## DO NOT

- Não criar opção de cadastro público — apenas admin cria usuários
- Não usar `supabase.auth` diretamente nas páginas — usar `useAuth()`
- Não hardcodar IDs de categorias (exceto no filtro de produção, onde é necessário)
- Não adicionar dependências sem verificar `package.json` primeiro
- Não fazer reload manual — usar Supabase Realtime para sincronização

## Skills disponíveis (Synapse)

As skills abaixo estão instaladas em `C:\Users\Admin\.claude\plugins\marketplaces\synapse-local\` e fornecem instruções detalhadas para operações comuns:

- **supabase** — queries SQL, CRUD, vector search, schema
- **github** — gh CLI para PRs, issues, CI
- **vercel-deploy** — deploy, env vars, logs (alternativa ao Cloudflare)
- **frontend-design** — UI/UX de alto nível, anti-padrões visuais
- **vibe-coding** — workflow Research-Plan-Implement, prompts eficazes
- **performance-monitoring** — otimização de queries, monitoramento
- **whatsapp-integration** — se quiser notificações WhatsApp no futuro

## Comandos úteis

```bash
bun run dev          # Iniciar servidor local
bun run build        # Build de produção
bun run lint         # Verificar erros ESLint
bun run format       # Formatar com Prettier
```

## Variáveis de ambiente necessárias

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
