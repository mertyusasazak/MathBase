// app/components/AIPanel.tsx

'use client'

import { useState, useRef, useEffect } from 'react'
import { renderContent, renderTitle } from '@/lib/core/math'
import { Sparkles, BrainCircuit } from 'lucide-react'

interface Props {
  entryId: number
  entryTitle: string
}

export default function AIPanel({ entryId, entryTitle }: Props) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const ask = async () => {
    if (!question.trim() || loading) return
    const q = question
    setQuestion('')

    setMessages(prev => [
      ...prev,
      { role: 'user', text: q },
      { role: 'ai', text: '' }
    ])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId, question: q })
      })

      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })

        setMessages(prev => {
          const next = [...prev]
          next[next.length - 1] = { role: 'ai', text: full }
          return next
        })
      }
    } catch (e) {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'ai', text: '⚠ API error. Check your API settings or OpenRouter key.' }
        return next
      })
    } finally {
      setLoading(false)
    }
  }

  const parseThinking = (text: string) => {
    const hasThinkTag = text.includes('<think>');
    let thinkText = '';
    let answerText = text;

    if (hasThinkTag) {
      const match = text.match(/<think>([\s\S]*?)(?:<\/think>|$)/);
      if (match) {
        thinkText = match[1].trim();
        answerText = text.replace(/<think>[\s\S]*?(?:<\/think>|$)/, '').trim();
      }
    }

    const isStillThinking = hasThinkTag && !text.includes('</think>');
    return { thinkText, answerText, isStillThinking };
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      fontFamily: 'Instrument Sans, sans-serif',
      fontSize: '0.85rem',
      position: 'relative'
    }}>
      <style>{`
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        .think-box::-webkit-scrollbar { width: 4px; }
        .think-box::-webkit-scrollbar-track { background: transparent; }
        .think-box::-webkit-scrollbar-thumb { background: #2a2a33; border-radius: 4px; }
      `}</style>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2a33', fontSize: '0.72rem', color: '#7eb8b0', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={14} /> MathBase AI
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {messages.length === 0 && (
          <div style={{ color: '#7a7870', fontSize: '0.82rem', lineHeight: 1.6 }}>
            <p style={{ marginBottom: 12 }}>Ask anything about <strong style={{ color: '#e8e6df' }} dangerouslySetInnerHTML={{ __html: renderTitle(entryTitle) }} />:</p>
            {['Prove this step by step', 'Give me an intuitive explanation', 'What are the counter examples?', 'How does this relate to compactness?'].map(s => (
              <div key={s} onClick={() => setQuestion(s)} style={{ padding: '7px 10px', marginBottom: 6, borderRadius: 6, border: '1px solid #2a2a33', cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = '#7eb8b0')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a33')}>
                {s}
              </div>
            ))}
          </div>
        )}

        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          const { thinkText, answerText, isStillThinking } = parseThinking(m.text);

          return (
            <div key={i} style={{ marginBottom: 14, padding: '10px 12px', borderRadius: 8, background: m.role === 'user' ? 'rgba(201,168,76,0.08)' : '#16161a', borderLeft: `3px solid ${m.role === 'user' ? '#c9a84c' : '#7eb8b0'}`, fontFamily: m.role === 'ai' ? 'EB Garamond, serif' : undefined, fontSize: m.role === 'ai' ? '0.95rem' : '0.85rem', lineHeight: 1.65 }}>
              {m.role === 'ai' && <div style={{ color: '#7eb8b0', fontSize: '0.68rem', fontFamily: 'Instrument Sans, sans-serif', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>MathBase AI</div>}
              {m.role === 'ai' ? (
                m.text === '' && loading && isLast ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#c9a84c', fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.85rem', fontStyle: 'italic', animation: 'pulse-opacity 1.5s infinite ease-in-out' }}>
                    <BrainCircuit size={14} /> Establishing neural link...
                  </div>
                ) : (
                  <>
                    {thinkText && (
                      <div className="think-box" style={{ marginBottom: answerText ? 16 : 0, padding: '10px 14px', background: '#111113', border: '1px solid #2a2a33', borderLeft: '2px solid #5a5850', borderRadius: 6, color: '#7a7870', fontSize: '0.85rem', fontFamily: 'Courier New, monospace', maxHeight: isStillThinking ? 'none' : '120px', overflowY: 'auto', transition: 'max-height 0.3s ease-out' }}>
                        <div style={{ fontWeight: 600, color: '#c9a84c', marginBottom: 6, fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6, animation: isStillThinking ? 'pulse-opacity 1.5s infinite ease-in-out' : 'none' }}>
                          <BrainCircuit size={14} /> {isStillThinking ? 'Model is thinking...' : 'Thought Process'}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap', opacity: 0.8 }}>{thinkText}{isStillThinking && <span style={{ display: 'inline-block', width: 6, height: 12, background: '#c9a84c', marginLeft: 4, animation: 'pulse-opacity 1s infinite' }}></span>}</div>
                      </div>
                    )}
                    {(answerText || (!isStillThinking && thinkText)) && (
                      <div dangerouslySetInnerHTML={{ __html: renderContent(answerText) + (loading && isLast && !isStillThinking ? '<span style="display:inline-block; width:6px; height:14px; background:#c9a84c; margin-left:4px; vertical-align: middle; animation: pulse-opacity 1s infinite"></span>' : '') }} />
                    )}
                  </>
                )
              ) : m.text}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #2a2a33', display: 'flex', gap: 8 }}>
        <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && ask()} placeholder="Ask about this entry…" style={{ flex: 1, background: '#1e1e24', border: '1px solid #2a2a33', borderRadius: 6, color: '#e8e6df', fontFamily: 'Instrument Sans, sans-serif', fontSize: '0.82rem', padding: '8px 10px', outline: 'none' }} />
        <button className="btn-base btn-gold" style={{ height: 36, padding: '0 20px' }} onClick={ask} disabled={loading}><Sparkles size={16} /> Ask</button>
      </div>
    </div>
  )
}