import { NextRequest, NextResponse } from 'next/server'
import MemoryClient from 'mem0ai'

const ALLOWED_ORIGINS = new Set([
  'https://mem0-memory-agent.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
])

function originAllowed(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  // Same-origin server calls may omit Origin; only block cross-site origins.
  return !origin || ALLOWED_ORIGINS.has(origin)
}

export async function GET(req: NextRequest) {
  const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! })
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  try {
    const memories = await mem0.getAll({ user_id: userId })
    return NextResponse.json({ memories: memories ?? [] })
  } catch (err) {
    console.error('memories GET error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! })
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  try {
    await mem0.deleteAll({ user_id: userId })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('memories DELETE error:', err)
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
