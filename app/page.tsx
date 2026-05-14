'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Brain, Send, Loader2, Trash2, RefreshCw, User, Sparkles, ChevronDown, ChevronUp, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

interface Memory {
  id: string
  memory: string
  created_at?: string
  updated_at?: string
}

const SUGGESTED_STARTERS = [
  "Hi! My name is Eduardo and I'm a data scientist in Perth, WA.",
  "I'm learning AI engineering and I love building with Claude and Python.",
  "What do you already know about me?",
  "I prefer concise answers and practical examples.",
]

export default function Home() {
  const [userId, setUserId] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setChatLoading] = useState(false)
  const [memories, setMemories] = useState<Memory[]>([])
  const [memoriesOpen, setMemoriesOpen] = useState(false)
  const [memoriesLoading, setMemoriesLoading] = useState(false)
  const [clearingMemories, setClearingMemories] = useState(false)
  const [setupDone, setSetupDone] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const history = useRef<{ role: 'user' | 'assistant'; content: string }[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('mem0_user_id')
    if (saved) {
      setUserId(saved)
      setSetupDone(true)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat])

  const startSession = () => {
    if (!nameInput.trim()) return
    const id = nameInput.trim().toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString(36)
    localStorage.setItem('mem0_user_id', id)
    setUserId(id)
    setSetupDone(true)
  }

  const fetchMemories = useCallback(async () => {
    if (!userId) return
    setMemoriesLoading(true)
    try {
      const res = await fetch(`/api/memories?userId=${encodeURIComponent(userId)}`)
      const data = await res.json()
      setMemories(data.memories ?? [])
    } finally {
      setMemoriesLoading(false)
    }
  }, [userId])

  const clearMemories = async () => {
    if (!userId || !confirm('Clear all memories? This cannot be undone.')) return
    setClearingMemories(true)
    try {
      await fetch(`/api/memories?userId=${encodeURIComponent(userId)}`, { method: 'DELETE' })
      setMemories([])
      history.current = []
    } finally {
      setClearingMemories(false)
    }
  }

  const resetIdentity = () => {
    if (!confirm('This will log you out. Your memories in Mem0 are preserved. Continue?')) return
    localStorage.removeItem('mem0_user_id')
    setUserId('')
    setNameInput('')
    setSetupDone(false)
    setChat([])
    history.current = []
    setMemories([])
  }

  const sendMessage = async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || loading) return
    setInput('')
    setChat(prev => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: '', streaming: true }])
    setChatLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, userId, history: history.current }),
      })
      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let fullResponse = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n'); buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') continue
          try {
            const parsed = JSON.parse(raw)
            if (parsed.text) {
              fullResponse += parsed.text
              setChat(prev => {
                const u = [...prev]
                u[u.length - 1] = { ...u[u.length - 1], content: u[u.length - 1].content + parsed.text }
                return u
              })
            }
          } catch { /* ignore */ }
        }
      }

      setChat(prev => { const u = [...prev]; u[u.length - 1] = { ...u[u.length - 1], streaming: false }; return u })
      history.current = [...history.current, { role: 'user', content: msg }, { role: 'assistant', content: fullResponse }]

      if (memoriesOpen) setTimeout(fetchMemories, 1500)
    } catch (e) {
      setChat(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: 'Error: ' + String(e) }; return u })
    } finally {
      setChatLoading(false)
    }
  }

  if (!setupDone) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto" style={{ background: 'rgba(99,102,241,0.15)' }}>
              <Brain className="h-7 w-7" style={{ color: '#6366f1' }} />
            </div>
            <h1 className="text-xl font-bold">Memory Agent</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              An AI that remembers you — across every conversation, forever.
            </p>
          </div>

          <div className="rounded-2xl border p-5 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide block mb-2" style={{ color: 'var(--muted)' }}>
                What&apos;s your name?
              </label>
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startSession()}
                placeholder="e.g. Eduardo"
                autoFocus
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
            </div>
            <button
              onClick={startSession}
              disabled={!nameInput.trim()}
              className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
              style={{ background: '#6366f1', color: '#fff' }}>
              <Sparkles className="h-4 w-4" />
              Start Chatting
            </button>
            <p className="text-xs text-center" style={{ color: 'var(--muted)' }}>
              Your memories persist across sessions via Mem0
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header className="border-b px-4 py-3 flex items-center justify-between"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Brain className="h-4 w-4" style={{ color: '#6366f1' }} />
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">Memory Agent</h1>
            <p className="text-[11px]" style={{ color: 'var(--muted)' }}>Powered by Claude + Mem0</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setMemoriesOpen(p => !p); if (!memoriesOpen) fetchMemories() }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)', background: memoriesOpen ? 'var(--bg-input)' : 'transparent' }}>
            <Brain className="h-3.5 w-3.5" />
            Memories
            {memoriesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button onClick={resetIdentity} className="p-1.5 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: 'var(--muted)' }} title="Switch user">
            <User className="h-4 w-4" />
          </button>
        </div>
      </header>

      {memoriesOpen && (
        <div className="border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                What I remember about you ({memories.length})
              </p>
              <div className="flex items-center gap-2">
                <button onClick={fetchMemories} disabled={memoriesLoading}
                  className="p-1 rounded hover:opacity-70 transition-opacity disabled:opacity-40"
                  style={{ color: 'var(--muted)' }}>
                  <RefreshCw className={cn('h-3.5 w-3.5', memoriesLoading && 'animate-spin')} />
                </button>
                <button onClick={clearMemories} disabled={clearingMemories || !memories.length}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg disabled:opacity-40 hover:opacity-70 transition-opacity"
                  style={{ color: '#e74c3c' }}>
                  <Trash2 className="h-3 w-3" />
                  Clear all
                </button>
                <button onClick={() => setMemoriesOpen(false)} style={{ color: 'var(--muted)' }}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {memoriesLoading ? (
              <div className="flex items-center gap-2 py-2" style={{ color: 'var(--muted)' }}>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="text-xs">Loading memories…</span>
              </div>
            ) : memories.length === 0 ? (
              <p className="text-xs py-2" style={{ color: 'var(--muted)' }}>
                No memories yet — start chatting and I&apos;ll remember things about you.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {memories.map(m => (
                  <span key={m.id} className="text-xs px-2.5 py-1 rounded-full border"
                    style={{ borderColor: 'rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.08)', color: 'var(--text)' }}>
                    {m.memory}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {chat.length === 0 && (
            <div className="text-center space-y-6 pt-8">
              <div className="space-y-1">
                <p className="font-semibold">Hey there! I&apos;m your memory-powered assistant.</p>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  I remember everything you tell me — even after you close this tab.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>Try saying:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTED_STARTERS.map(s => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="text-xs px-3 py-2 rounded-xl border hover:opacity-80 transition-opacity text-left max-w-xs"
                      style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', color: 'var(--text)' }}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {chat.map((m, i) => (
            <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mr-2 mt-0.5"
                  style={{ background: 'rgba(99,102,241,0.15)' }}>
                  <Brain className="h-3.5 w-3.5" style={{ color: '#6366f1' }} />
                </div>
              )}
              <div className={cn('max-w-lg text-sm px-4 py-3 rounded-2xl leading-relaxed',
                m.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm')}
                style={{
                  background: m.role === 'user' ? '#6366f1' : 'var(--bg-card)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                  border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                }}>
                {m.streaming && m.content === ''
                  ? <span className="flex gap-1 py-0.5">
                      {[0, 1, 2].map(d => (
                        <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ background: 'var(--muted)', animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </span>
                  : <span className="whitespace-pre-wrap">{m.content}</span>
                }
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Say anything — I'll remember it…"
            disabled={loading}
            className="flex-1 rounded-xl px-4 py-3 text-sm outline-none disabled:opacity-50"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="p-3 rounded-xl disabled:opacity-40 transition-opacity"
            style={{ background: '#6366f1', color: '#fff' }}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
          Memories are saved automatically after each message
        </p>
      </div>
    </div>
  )
}
