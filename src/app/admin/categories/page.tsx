'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AVAILABLE_ICONS, getMarkerSvgHtml } from '@/lib/markerIcons'
import type { Category } from '@/types'

const DEFAULT_COLOR = '#3b82f6'

function IconPicker({ selected, onSelect }: { selected: string; onSelect: (icon: string) => void }) {
  return (
    <div className="grid grid-cols-6 gap-1 max-h-48 overflow-y-auto border rounded-lg p-2">
      {AVAILABLE_ICONS.map((icon) => (
        <button
          key={icon}
          type="button"
          title={icon}
          onClick={() => onSelect(icon)}
          className={`p-1.5 rounded flex items-center justify-center border transition-colors ${
            selected === icon ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:bg-gray-100'
          }`}
          dangerouslySetInnerHTML={{
            __html: getMarkerSvgHtml(icon, selected === icon ? DEFAULT_COLOR : '#6b7280', 28),
          }}
        />
      ))}
    </div>
  )
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editCat, setEditCat] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: '', icon: '', color: DEFAULT_COLOR })
  const [saving, setSaving] = useState(false)

  async function fetchCategories() {
    setLoading(true)
    const res = await fetch('/api/categories')
    const json = await res.json()
    setCategories(json.data?.categories ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  function openNew() {
    setEditCat(null)
    setForm({ name: '', icon: '', color: DEFAULT_COLOR })
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditCat(cat)
    setForm({ name: cat.name, icon: cat.icon ?? '', color: cat.color ?? DEFAULT_COLOR })
    setDialogOpen(true)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = { name: form.name, icon: form.icon || null, color: form.color || null }
      const res = editCat
        ? await fetch(`/api/categories/${editCat.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) {
        setDialogOpen(false)
        fetchCategories()
      } else {
        const json = await res.json()
        alert(json.error ?? '저장 실패')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return
    const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
    if (res.ok) fetchCategories()
    else alert('삭제 실패')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">카테고리 관리</h1>
        <Button onClick={openNew}>+ 카테고리 추가</Button>
      </div>

      {loading ? (
        <p className="text-gray-500">불러오는 중...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-gray-600">
                <th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-left">마커 미리보기</th>
                <th className="px-4 py-3 text-left">색상</th>
                <th className="px-4 py-3 text-left">아이콘</th>
                <th className="px-4 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">카테고리가 없습니다.</td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{cat.name}</td>
                    <td className="px-4 py-3">
                      {cat.icon && cat.color ? (
                        <span
                          dangerouslySetInnerHTML={{ __html: getMarkerSvgHtml(cat.icon, cat.color, 32) }}
                        />
                      ) : (
                        <span className="text-gray-400 text-xs">기본 마커</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cat.color ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full border" style={{ background: cat.color }} />
                          <span className="text-xs text-gray-500">{cat.color}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">없음</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{cat.icon ?? '없음'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(cat)}>수정</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(cat.id, cat.name)}>삭제</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editCat ? '카테고리 수정' : '카테고리 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium mb-1">이름 *</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="예: 한식"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">색상</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="w-32 text-xs"
                  placeholder="#3b82f6"
                />
                {form.icon && (
                  <span dangerouslySetInnerHTML={{ __html: getMarkerSvgHtml(form.icon, form.color, 36) }} />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">아이콘</label>
              <IconPicker selected={form.icon} onSelect={(icon) => setForm((f) => ({ ...f, icon }))} />
              {form.icon && (
                <p className="text-xs text-gray-500 mt-1">선택됨: {form.icon}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>취소</Button>
              <Button onClick={handleSave} disabled={saving || !form.name}>
                {saving ? '저장 중...' : '저장'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
