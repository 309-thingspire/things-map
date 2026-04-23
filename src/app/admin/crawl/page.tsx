'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { StagingStore, CrawlJob } from '@/types'

export default function AdminCrawlPage() {
  const [keyword, setKeyword] = useState('')
  const [platform, setPlatform] = useState('KAKAO')
  const [crawling, setCrawling] = useState(false)
  const [crawlResult, setCrawlResult] = useState<{ count: number } | null>(null)

  const [playwrightName, setPlaywrightName] = useState('')
  const [playwrightLoading, setPlaywrightLoading] = useState(false)
  const [playwrightPreview, setPlaywrightPreview] = useState<Record<string, string> | null>(null)
  const [playwrightStagingId, setPlaywrightStagingId] = useState<string | null>(null)

  const [stagingItems, setStagingItems] = useState<(StagingStore & { crawlJob?: { platform: string; keyword: string } })[]>([])
  const [jobs, setJobs] = useState<(CrawlJob & { admin?: { name: string } })[]>([])
  const [stagingLoading, setStagingLoading] = useState(false)

  async function fetchStaging() {
    setStagingLoading(true)
    const res = await fetch('/api/crawl/staging?status=PENDING')
    if (res.ok) {
      const json = await res.json()
      setStagingItems(json.data.items)
    }
    setStagingLoading(false)
  }

  async function fetchJobs() {
    const res = await fetch('/api/crawl/jobs')
    if (res.ok) {
      const json = await res.json()
      setJobs(json.data.jobs)
    }
  }

  useEffect(() => { fetchStaging(); fetchJobs() }, [])

  async function handleApiCrawl() {
    setCrawling(true)
    setCrawlResult(null)
    const res = await fetch('/api/crawl/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, keyword }),
    })
    if (res.ok) {
      const json = await res.json()
      setCrawlResult({ count: json.data.count })
      fetchStaging(); fetchJobs()
    }
    setCrawling(false)
  }

  async function handlePlaywright() {
    setPlaywrightLoading(true)
    setPlaywrightPreview(null)
    const res = await fetch('/api/crawl/playwright', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName: playwrightName }),
    })
    if (res.ok) {
      const json = await res.json()
      setPlaywrightPreview(json.data.preview)
      setPlaywrightStagingId(json.data.stagingId)
      fetchStaging()
    }
    setPlaywrightLoading(false)
  }

  async function approveStaging(id: string) {
    await fetch(`/api/crawl/staging/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
    fetchStaging()
  }

  async function rejectStaging(id: string) {
    await fetch(`/api/crawl/staging/${id}`, { method: 'DELETE' })
    fetchStaging()
  }

  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
    DONE: 'default', RUNNING: 'secondary', FAILED: 'destructive', PENDING: 'secondary'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">데이터 수집</h1>

      <Tabs defaultValue="api">
        <TabsList className="mb-4">
          <TabsTrigger value="api">API 수집</TabsTrigger>
          <TabsTrigger value="playwright">단건 조회</TabsTrigger>
          <TabsTrigger value="staging">수집 목록 ({stagingItems.length})</TabsTrigger>
          <TabsTrigger value="jobs">작업 이력</TabsTrigger>
        </TabsList>

        {/* API 수집 */}
        <TabsContent value="api">
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4 max-w-lg">
            <h2 className="font-semibold">카카오/네이버 API 수집</h2>
            <div className="flex gap-2">
              <select
                className="border rounded-md px-3 py-2 text-sm"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="KAKAO">카카오</option>
                <option value="NAVER">네이버</option>
              </select>
              <Input
                placeholder="키워드 (예: 성수동 카페)"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="flex-1"
              />
            </div>
            <Button onClick={handleApiCrawl} disabled={crawling || !keyword}>
              {crawling ? '수집 중...' : '수집 실행'}
            </Button>
            {crawlResult && (
              <p className="text-sm text-green-600">✅ {crawlResult.count}개 수집 완료 → 임시 목록에 추가됨</p>
            )}
          </div>
        </TabsContent>

        {/* Playwright 단건 */}
        <TabsContent value="playwright">
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4 max-w-lg">
            <h2 className="font-semibold">Playwright 단건 조회</h2>
            <div className="flex gap-2">
              <Input
                placeholder="매장명 (예: 성수동 XX카페)"
                value={playwrightName}
                onChange={(e) => setPlaywrightName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handlePlaywright} disabled={playwrightLoading || !playwrightName}>
                {playwrightLoading ? '조회 중...' : '조회'}
              </Button>
            </div>
            {playwrightPreview && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-medium">{playwrightPreview.name as string}</h3>
                <p className="text-sm text-gray-600">{playwrightPreview.address as string}</p>
                {playwrightPreview.phone && <p className="text-sm text-gray-600">📞 {String(playwrightPreview.phone)}</p>}
                {playwrightPreview.businessHours && <p className="text-sm text-gray-600">🕐 {String(playwrightPreview.businessHours)}</p>}
                <p className="text-xs text-green-600 mt-2">✅ 임시 목록에 저장됨 (ID: {playwrightStagingId})</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* 수집 목록 */}
        <TabsContent value="staging">
          {stagingLoading ? (
            <p className="text-gray-400">불러오는 중...</p>
          ) : (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">매장명</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">주소</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">출처</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stagingItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{item.address}</td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {item.crawlJob?.platform} · {item.crawlJob?.keyword}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button size="sm" onClick={() => approveStaging(item.id)}>승인</Button>
                        <Button size="sm" variant="destructive" onClick={() => rejectStaging(item.id)}>버림</Button>
                      </td>
                    </tr>
                  ))}
                  {stagingItems.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">대기 중인 항목이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* 작업 이력 */}
        <TabsContent value="jobs">
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">플랫폼</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">키워드</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">결과</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">상태</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">실행자</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">실행 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><Badge variant="outline">{job.platform}</Badge></td>
                    <td className="px-4 py-3 text-gray-700">{job.keyword}</td>
                    <td className="px-4 py-3 text-gray-500">{job.resultCount}개</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[job.status]}>{job.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{(job as { admin?: { name: string } }).admin?.name ?? 'Cron'}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{new Date(job.executedAt).toLocaleString('ko-KR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
