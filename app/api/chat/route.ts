import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import MemoryClient from 'mem0ai'

const SYSTEM_PROMPT = `You are a personal AI assistant with long-term memory. You genuinely remember things about the user across all conversations — their name, goals, preferences, past topics, and anything they've shared.

When memories are provided, use them naturally to personalize your responses. Don't announce "I remember that..." awkwardly — just use the knowledge fluidly, the way a good friend would.

Be warm, helpful, and concise. If the user shares something new about themselves, acknowledge it naturally.`

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! })

  const { message, userId, history = [] } = await req.json()

  if (!message?.trim() || !userId?.trim()) {
    return NextResponse.json({ error: 'Missing message or userId' }, { status: 400 })
  }

  // Fetch relevant memories for context
  let memoryContext = ''
  try {
    const memories = await mem0.search(message, { user_id: userId, limit: 10 })
    if (memories?.length) {
      memoryContext = '\n\nWhat I remember about this user:\n' +
        memories.map((m: { memory?: string }) => `- ${m.memory ?? ''}`).join('\n')
    }
  } catch {
    // proceed without memories if search fails
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.map(({ role, content }: { role: 'user' | 'assistant'; content: string }) => ({ role, content })),
    { role: 'user', content: message },
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = ''
      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: SYSTEM_PROMPT + memoryContext,
          messages,
        })

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullResponse += event.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()

        try {
          await mem0.add([
            { role: 'user', content: message },
            { role: 'assistant', content: fullResponse },
          ], { user_id: userId })
        } catch {
          // non-fatal
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  })
}
