import { NextRequest, NextResponse } from 'next/server'
import MemoryClient from 'mem0ai'

export async function GET(req: NextRequest) {
  const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! })
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  try {
    const memories = await mem0.getAll({ user_id: userId })
    return NextResponse.json({ memories: memories ?? [] })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const mem0 = new MemoryClient({ apiKey: process.env.MEM0_API_KEY! })
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  try {
    await mem0.deleteAll({ user_id: userId })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
