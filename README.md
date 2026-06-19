# Memory Agent

> A chat assistant that actually remembers you — across every conversation, even after you close the tab.

**🔗 Live demo:** https://mem0-memory-agent.vercel.app

Most chatbots forget everything the moment the session ends. Memory Agent pairs Claude with [Mem0](https://mem0.ai)'s long-term memory layer so it builds a persistent profile of each user — their name, goals, preferences, and past topics — and weaves that context naturally into every reply. It's a compact, production-shaped demo of the retrieve-augment-persist loop that gives an LLM durable memory.

## Features
- **Persistent long-term memory** — facts you share are extracted and stored in Mem0, then recalled in future sessions (not just within one chat).
- **Streaming responses** — replies stream token-by-token over Server-Sent Events for a live, real-time feel.
- **Per-user memory** — each visitor gets their own `userId` (kept in `localStorage`), so memories are scoped to that person.
- **Inspectable memory panel** — a "Memories" drawer shows exactly what the agent currently remembers about you, with a one-click refresh.
- **Clear all / switch user** — wipe stored memories or start a fresh identity at any time.
- **Conversation-starter suggestions** — guided prompts on the empty state to demonstrate the memory loop quickly.
- **Server-side keys** — both the Anthropic and Mem0 API keys live only in server route handlers, never in the browser, with an origin allow-list on write endpoints.

## How it works
The app is a Next.js project (App Router) with a React client and two server route handlers. On each turn, `POST /api/chat` first calls `mem0.search()` to pull the most relevant stored memories for the user's message, injects them into Claude's system prompt, then streams the completion from the `@anthropic-ai/sdk` (`claude-sonnet-4-6`) back to the browser as Server-Sent Events. After the response finishes, the full user/assistant exchange is handed to `mem0.add()` so new facts are extracted and persisted for next time. A second handler, `/api/memories`, exposes `getAll` (read) and `deleteAll` (clear) for the memory panel. Both the `ANTHROPIC_API_KEY` and `MEM0_API_KEY` are read from `process.env` inside the server routes, so secrets never reach the client.

## Tech stack
- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript
- **AI provider:** Anthropic Claude (`claude-sonnet-4-6`) via `@anthropic-ai/sdk`
- **Memory:** Mem0 (`mem0ai` SDK) for long-term storage, retrieval, and extraction
- **Styling/UI:** Tailwind CSS v4 + lucide-react icons
- **Persistence:** Mem0 (server-side memory) + `localStorage` (client-side user identity)
- **Hosting:** Vercel

## Running locally
```bash
npm install
npm run dev
```

## Environment variables
| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Authenticates calls to the Claude API (used server-side in the chat route). |
| `MEM0_API_KEY` | Authenticates calls to Mem0 for storing, searching, and retrieving long-term memories. |

---
*Part of my AI engineering portfolio — built by Eduardo San Martin ([github.com/anihc1978](https://github.com/anihc1978)).*
