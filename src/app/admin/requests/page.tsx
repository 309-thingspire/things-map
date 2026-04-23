'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import type { StoreRequest } from '@/types'

const STATUS_LABELS: Record<string, string> = { PENDING: '대기', APPROVED: '승인', REJECTED: '반려' }
const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
}

interface Toast { type: 'success' | 'error' | 'warning'; message: string }

function ToastBar({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000)
    return () => clearTimeout(t)
  }, [onDismiss])
  const colors = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-amber-500' }
  const Icon = toast.type === 'success' ? CheckCircle : XCircle
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white ${colors[toast.type]}`}>
      <Icon size={16} />
      {toast.message}
    </div>
  )
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<StoreRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [selectedReq, setSelectedReq] = useState<StoreRequest | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [activeTab, setActiveTab] = useState('ALL')
  const [toast, setToast] = useState<Toast | null>(null)

  async function fetchRequests(status?: string) {
    const url = status && status !== 'ALL' ? `/api/requests?status=${status}` : '/api/requests'
    const res = await fetch(url)
    if (res.ok) {
      const json = await res.json()
      setRequests(json.data.requests)
    }
    setLoading(false)
  }

  useEffect(() => { fetchRequests() }, [])

  async function handleProcess(status: 'APPROVED' | 'REJECTED') {
    if (!selectedReq) return
    setProcessing(true)
    try {
      const res = await fetch(`/api/requests/${selectedReq.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, adminNote }),
      })
      const json = await res.json()

      if (!res.ok) {
        setToast({ type: 'error', message: json.error ?? '처리 중 오류가 발생했습니다.' })
        return
      }

      if (status === 'APPROVED') {
        if (json.warning) {
          setToast({ type: 'warning', message: json.warning })
        } else if (json.store) {
          const via = json.autoCollected ? '(네이버 자동 수집)' : ''
          setToast({ type: 'success', message: `"${json.store.name}" 매장 등록 완료 ${via}` })
        }
      } else {
        setToast({ type: 'success', message: '반려 처리되었습니다.' })
      }

      setSelectedReq(null)
      fetchRequests(activeTab)
    } finally {
      setProcessing(false)
    }
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    fetchRequests(tab)
  }

  const filtered = activeTab === 'ALL' ? requests : requests.filter((r) => r.status === activeTab)

  return (
    <div>
      {toast && <ToastBar toast={toast} onDismiss={() => setToast(null)} />}

      <h1 className="text-2xl font-bold text-gray-900 mb-6">등록 요청 관리</h1>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="mb-4">
          <TabsTrigger value="ALL">전체</TabsTrigger>
          <TabsTrigger value="PENDING">대기</TabsTrigger>
          <TabsTrigger value="APPROVED">승인</TabsTrigger>
          <TabsTrigger value="REJECTED">반려</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          {loading ? (
            <p className="text-gray-400">불러오는 중...</p>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">요청자</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">유형</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">매장명</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">요청일</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">상세</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{req.user.name} <span className="text-gray-400 text-xs">({req.user.team})</span></td>
                      <td className="px-4 py-3"><Badge variant="outline">{req.requestType === 'NEW' ? '신규' : '수정'}</Badge></td>
                      <td className="px-4 py-3 text-gray-700">{(req.payload as Record<string, string>).name ?? '-'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={STATUS_VARIANTS[req.status]}>{STATUS_LABELS[req.status]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(req.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedReq(req); setAdminNote(req.adminNote ?? '') }}>
                          보기
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedReq} onOpenChange={(o) => { if (!o) setSelectedReq(null) }}>
        <SheetContent className="w-[480px]">
          <SheetHeader>
            <SheetTitle>요청 상세</SheetTitle>
          </SheetHeader>
          {selectedReq && (
            <div className="mt-4 space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
                승인 시 네이버 검색으로 좌표·주소·전화번호·URL을 자동 수집하여 매장을 등록합니다.
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">요청 데이터</p>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto max-h-60">
                  {JSON.stringify(selectedReq.payload, null, 2)}
                </pre>
              </div>

              <div>
                <label className="text-xs text-gray-400 mb-1 block">관리자 메모</label>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                  placeholder="반려 사유 등 메모"
                />
              </div>

              {selectedReq.status === 'PENDING' && (
                <div className="flex gap-2">
                  <Button className="flex-1" onClick={() => handleProcess('APPROVED')} disabled={processing}>
                    {processing ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                    승인 및 자동 등록
                  </Button>
                  <Button variant="destructive" className="flex-1" onClick={() => handleProcess('REJECTED')} disabled={processing}>
                    반려
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
