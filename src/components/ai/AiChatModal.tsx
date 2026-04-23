'use client'

import { useRef, useEffect, useState } from 'react'
import { X, Send, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { StoreListItem } from '@/types'

export type Message = {
  role: 'user' | 'assistant'
  content: string
  stores?: StoreListItem[]
}

interface Props {
  open: boolean
  onClose: () => void
  messages: Message[]
  onMessages: (msgs: Message[]) => void
}

const STORE_TAG_RE = /\[STORE:([^\]]+)\]/g

function ChatStoreCard({ store, onClose }: { store: StoreListItem; onClose: () => void }) {
  function handleClick() {
    window.dispatchEvent(new CustomEvent('ddingbot:selectStore', { detail: { storeId: store.id } }))
    onClose()
  }

  return (
    <button
      onClick={handleClick}
      className="w-64 shrink-0 text-left border border-gray-200 rounded-xl p-3 bg-white hover:shadow-md hover:border-blue-300 transition-all"
    >
      <p className="font-semibold text-gray-900 text-sm truncate">{store.name}</p>
      {store.walkingMinutes != null && (
        <p className="text-xs text-blue-500 mt-0.5">🚶 도보 {store.walkingMinutes}분</p>
      )}
      <div className="flex flex-wrap gap-1 mt-1.5">
        {store.category && (
          <span className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{store.category.name}</span>
        )}
        {store.themeTags.slice(0, 2).map((tag) => (
          <span key={tag} className="text-xs border border-gray-200 text-gray-500 rounded px-1.5 py-0.5">{tag}</span>
        ))}
      </div>
      {store.internalRating && (
        <p className="text-xs text-amber-500 mt-1">★ {store.internalRating.avgTotal.toFixed(1)} ({store.internalRating.reviewCount}개)</p>
      )}
    </button>
  )
}

export default function AiChatModal({ open, onClose, messages, onMessages }: Props) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!open) return null

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    const userMsg: Message = { role: 'user', content: text }
    const history = [...messages, userMsg]
    onMessages([...history, { role: 'assistant', content: '' }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (res.status === 502) {
        onMessages([...history, { role: 'assistant', content: '관리자 서버가 현재 연결되지 않아 띵봇을 사용할 수 없어요 😢 잠시 후 다시 시도해주세요!' }])
        setLoading(false)
        return
      }
      if (!res.ok || !res.body) throw new Error('응답 오류')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        onMessages([...history, { role: 'assistant', content: full }])
      }

      const ids = [...new Set([...full.matchAll(STORE_TAG_RE)].map((m) => m[1]))]
      const cleanContent = full.replace(STORE_TAG_RE, '').replace(/[ \t]+\n/g, '\n').trim()

      let stores: StoreListItem[] = []
      if (ids.length > 0) {
        const results = await Promise.all(
          ids.map((id) =>
            fetch(`/api/stores/${id}`)
              .then((r) => (r.ok ? r.json().then((d: { data: StoreListItem }) => d.data) : null))
              .catch(() => null)
          )
        )
        stores = results.filter((s): s is StoreListItem => s !== null)
      }

      onMessages([...history, { role: 'assistant', content: cleanContent, stores }])
    } catch {
      onMessages([...history, { role: 'assistant', content: '죄송해요, 응답 중 오류가 발생했어요.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-2xl h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={20} className="text-blue-500" />
            <span className="font-semibold text-gray-900">띵봇</span>
            <span className="text-xs text-gray-400 hidden sm:block">등록된 매장 정보만 알아요</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-8">
              <Bot size={32} className="mx-auto mb-2 text-gray-300" />
              <p>안녕하세요! 근처 맛집이나 카페를 추천해드릴게요 😊</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={msg.role === 'user' ? 'max-w-[80%]' : 'w-full'}>
                {/* 사용자 메시지: 말풍선 */}
                {msg.role === 'user' && msg.content && (
                  <div className="bg-blue-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed">
                    {msg.content}
                  </div>
                )}

                {/* 어시스턴트 메시지: 마크다운 렌더링 */}
                {msg.role === 'assistant' && (
                  <>
                    {msg.content ? (
                      <div className="px-1 py-1 text-sm text-gray-800">
                        <ReactMarkdown
                          components={{
                            h2: ({ children }) => <p className="font-bold text-gray-900 text-base mb-1">{children}</p>,
                            h3: ({ children }) => <p className="font-semibold text-gray-800 mb-0.5">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                            ul: ({ children }) => <ul className="space-y-0.5 my-1">{children}</ul>,
                            li: ({ node: _node, children, ...props }) => {
                              const text = Array.isArray(children)
                                ? children.map((c) => (typeof c === 'string' ? c : '')).join('').trim()
                                : String(children ?? '').trim()
                              if (!text) return null
                              return <li className="text-gray-700 leading-relaxed" {...props}>{children}</li>
                            },
                            p: ({ children }) => <p className="mb-1 last:mb-0 leading-relaxed">{children}</p>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    ) : loading && i === messages.length - 1 ? (
                      <div className="px-1 py-2 text-sm text-gray-400 animate-pulse">답변 생성 중...</div>
                    ) : null}

                    {/* 카드 가로 스크롤 */}
                    {msg.stores && msg.stores.length > 0 && (
                      <div className="mt-2 flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 items-start scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        {msg.stores.map((store) => (
                          <ChatStoreCard key={store.id} store={store} onClose={onClose} />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 border-t shrink-0 flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder="질문을 입력하세요... (Shift+Enter로 줄바꿈)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-50"
            style={{ fontSize: '16px' }}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-40 transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
