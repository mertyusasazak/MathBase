'use client'

import { useState, useRef, useEffect } from 'react'
import { renderContent, renderTitle } from '@/lib/core/math'
import { Sparkles, BrainCircuit, Send, RotateCcw } from 'lucide-react'
import { theme } from '@/lib/core/theme'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

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
      fontFamily: theme.typography.sans,
      fontSize: '0.85rem',
      position: 'relative',
      background: theme.colors.background
    }}>
      <style>{`
        @keyframes pulse-opacity {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: `1px solid ${theme.colors.border}`, 
        fontSize: '0.72rem', 
        color: theme.colors.accent, 
        textTransform: 'uppercase', 
        letterSpacing: '0.1em', 
        display: 'flex', 
        alignItems: 'center', 
        gap: 8,
        fontWeight: 700
      }}>
        <Sparkles size={14} /> MathBase AI Assistant
      </div>

      {/* Messages Area */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 16,
        scrollbarWidth: 'thin'
      }}>
        {messages.length === 0 && (
          <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            opacity: 0.5, 
            textAlign: 'center', 
            padding: '0 20px',
            color: theme.colors.textMuted
          }}>
            <BrainCircuit size={48} style={{ marginBottom: 16, color: theme.colors.accent }} />
            <div style={{ fontWeight: 600, color: theme.colors.text }}>Ask about "{entryTitle}"</div>
            <p style={{ fontSize: '0.75rem', marginTop: 8 }}>E.g., "Explain this theorem intuitively" or "What are the key steps?"</p>
          </div>
        )}

        {messages.map((m, i) => {
          const isAI = m.role === 'ai';
          const isLast = i === messages.length - 1;
          const { thinkText, answerText, isStillThinking } = isAI ? parseThinking(m.text) : { thinkText: '', answerText: m.text, isStillThinking: false };

          return (
            <div key={i} style={{ 
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', 
              maxWidth: '90%',
              marginBottom: 4
            }}>
              <div style={{ 
                padding: '12px 16px', 
                borderRadius: 12, 
                background: isAI ? theme.colors.surface : `${theme.colors.accent}15`, 
                border: `1px solid ${isAI ? theme.colors.border : theme.colors.accent}`,
                color: theme.colors.text,
                lineHeight: 1.6,
                fontSize: isAI ? '0.92rem' : '0.85rem',
                fontFamily: isAI ? theme.typography.serif : theme.typography.sans,
                boxShadow: isAI ? 'none' : `0 4px 12px ${theme.colors.accent}11`
              }}>
                {isAI && (
                  <div style={{ 
                    color: theme.colors.accent, 
                    fontSize: '0.65rem', 
                    fontFamily: theme.typography.sans, 
                    marginBottom: 8, 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.08em',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    <Sparkles size={12} /> MathBase AI
                  </div>
                )}

                {isAI && thinkText && (
                  <div style={{ 
                    background: `${theme.colors.background}88`, 
                    padding: '10px 14px', 
                    borderRadius: 8, 
                    borderLeft: `3px solid ${theme.colors.border}`, 
                    marginBottom: 12, 
                    fontSize: '0.8rem', 
                    color: theme.colors.textMuted, 
                    fontStyle: 'italic',
                    position: 'relative',
                    fontFamily: 'monospace'
                  }}>
                    {isStillThinking && <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: theme.colors.accent, animation: 'pulse-opacity 1s infinite' }} />}
                    <div style={{ fontWeight: 600, fontSize: '0.65rem', marginBottom: 4, textTransform: 'uppercase', opacity: 0.6 }}>Thought Process</div>
                    {thinkText}
                  </div>
                )}

                <div dangerouslySetInnerHTML={{ __html: renderContent(answerText) }} />
                
                {isAI && m.text === '' && loading && isLast && (
                  <div style={{ display: 'flex', gap: 6, padding: '8px 0', alignItems: 'center', color: theme.colors.accent }}>
                    <BrainCircuit size={14} className="animate-pulse" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Synthesizing explanation...</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div style={{ 
        padding: '16px', 
        borderTop: `1px solid ${theme.colors.border}`, 
        background: theme.colors.surface,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Input
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && ask()}
              placeholder="Ask AI about this entry..."
              autoComplete="off"
            />
          </div>
          <Button
            variant="gold"
            onClick={ask}
            disabled={!question.trim() || loading}
            icon={<Send size={16} />}
            style={{ padding: '0 16px', height: 40 }}
          />
          {messages.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setMessages([])}
              icon={<RotateCcw size={16} />}
              style={{ width: 40, padding: 0 }}
            />
          )}
        </div>
      </div>
    </div>
  )
}