'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ViewModeProvider, useViewMode } from '@/contexts/ViewModeContext'
import { Map, List, ClipboardList, X, LayoutDashboard, Bot } from 'lucide-react'
import RequestModal from '@/components/store/RequestModal'
import LoginPromptModal from '@/components/store/LoginPromptModal'
import AiChatModal, { type Message as ChatMessage } from '@/components/ai/AiChatModal'
import type { ReactNode } from 'react'

function getAvatarColor(name: string): string {
  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % colors.length
  return colors[hash]
}

function NavContent() {
  const { user, loading, logout } = useAuth()
  const pathname = usePathname()
  const isMapPage = pathname === '/'
  const { viewMode, setViewMode } = useViewMode()
  const [profileOpen, setProfileOpen] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [loginPromptOpen, setLoginPromptOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [showBotTooltip, setShowBotTooltip] = useState(false)
  const [chatLoaded, setChatLoaded] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!localStorage.getItem('ddingbot_used')) setShowBotTooltip(true)
    // 페이지 새로고침 후에도 대화 이어가기
    try {
      const saved = localStorage.getItem('ddingbot_history')
      if (saved) {
        const parsed: ChatMessage[] = JSON.parse(saved)
        if (parsed.length > 0) setChatMessages(parsed)
      }
    } catch { /* ignore */ }
    setChatLoaded(true)
  }, [])

  // 대화 변경 시 localStorage에 저장 (텍스트만, 최근 20개)
  useEffect(() => {
    if (!chatLoaded) return
    try {
      const saveable = chatMessages.slice(-20).map((m) => ({ role: m.role, content: m.content }))
      localStorage.setItem('ddingbot_history', JSON.stringify(saveable))
    } catch { /* ignore */ }
  }, [chatMessages, chatLoaded])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    if (profileOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileOpen])

  const pillCls = 'flex items-center bg-white/90 backdrop-blur-sm rounded-full border border-gray-200 shadow-sm'
  const iconBtnCls = 'p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-full'

  const isListMode = isMapPage && viewMode === 'list'

  return (
    <nav className="flex items-center gap-2">
      {/* 버튼 그룹: 지도/목록 + 등록요청 */}
      {!loading && (
        <div className={`${pillCls} px-1 gap-0.5`}>
          {isMapPage && user && (
            viewMode === 'map' ? (
              <button onClick={() => setViewMode('list')} className={iconBtnCls} title="목록">
                <List size={17} />
              </button>
            ) : (
              <button onClick={() => setViewMode('map')} className={iconBtnCls} title="지도">
                <Map size={17} />
              </button>
            )
          )}
          <button
            onClick={() => user ? setRequestOpen(true) : setLoginPromptOpen(true)}
            className={iconBtnCls}
            title="매장 등록 요청"
          >
            <ClipboardList size={17} />
          </button>
          <div className="relative">
            <button
              onClick={() => {
                if (user) {
                  setChatOpen(true)
                  if (showBotTooltip) {
                    setShowBotTooltip(false)
                    localStorage.setItem('ddingbot_used', '1')
                  }
                } else {
                  setLoginPromptOpen(true)
                }
              }}
              className={iconBtnCls}
              title="띵봇 AI 추천"
            >
              <Bot size={17} />
            </button>
            {showBotTooltip && (
              <div className="absolute top-full right-0 mt-2 z-30 pointer-events-none">
                <div className="relative bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 whitespace-nowrap shadow-lg">
                  <span className="absolute -top-[4px] right-3 w-0 h-0 border-l-4 border-r-4 border-b-[4px] border-l-transparent border-r-transparent border-b-gray-900" />
                  띵봇에게 물어보세요 🤖
                </div>
              </div>
            )}
          </div>
          {isListMode && (
            <button onClick={() => setViewMode('map')} className={`${iconBtnCls} text-gray-400`} title="닫기">
              <X size={17} />
            </button>
          )}
        </div>
      )}

      {/* 프로필 그룹 */}
      {!loading && user && (
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen((v) => !v)}
            className={`${pillCls} flex items-center gap-2 px-3 py-1.5 hover:bg-white transition-colors`}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: getAvatarColor(user.name) }}
            >
              {user.name[0]}
            </div>
            <span className="text-sm text-gray-700 font-medium hidden sm:block">{user.name}</span>
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-3 py-2.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{user.team}</p>
              </div>
              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <LayoutDashboard size={14} />
                  관리자 대시보드
                </Link>
              )}
              <button
                onClick={() => { setProfileOpen(false); logout() }}
                className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      )}

      {!loading && !user && (
        <Link href="/login" className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-600 transition-colors">
          로그인
        </Link>
      )}

      {requestOpen && <RequestModal onClose={() => setRequestOpen(false)} />}
      {loginPromptOpen && <LoginPromptModal onClose={() => setLoginPromptOpen(false)} />}
      <AiChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        onMessages={setChatMessages}
      />
    </nav>
  )
}

function UserLayoutInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isMapPage = pathname === '/'

  if (isMapPage) {
    return (
      <div className="relative h-screen">
        <header className="absolute top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-20">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.avif" alt="띵스파이어" width={120} height={32} className="h-8 w-auto object-contain" />
            <Image src="/icons_map.png" alt="" width={32} height={32} className="h-8 w-auto object-contain" />
          </Link>
          <NavContent />
        </header>
        <div className="absolute inset-0">
          {children}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="h-14 flex items-center justify-between px-4 z-20 shrink-0 bg-white border-b shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.avif" alt="띵스파이어" width={120} height={32} className="h-8 w-auto object-contain" />
          <Image src="/icons_map.png" alt="" width={32} height={32} className="h-8 w-auto object-contain" />
        </Link>
        <NavContent />
      </header>
      <div className="flex-1">
        {children}
      </div>
    </div>
  )
}

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <ViewModeProvider>
      <UserLayoutInner>{children}</UserLayoutInner>
    </ViewModeProvider>
  )
}
