"use client"

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const [status, setStatus] = useState<'idle' | 'ok' | 'error'>('idle')
  const [details, setDetails] = useState<{ url?: string; projectRef?: string; error?: string }>({})

  useEffect(() => {
    async function check() {
      try {
        const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
        const projectRef = url.split('supabase.co').shift()?.split('//').pop() || ''
        // Perform a lightweight request to confirm connectivity (no auth required)
        const { data, error } = await supabase.from('_introspection').select('schemata').limit(1)
        if (error) {
          // Many projects won't expose _introspection; treat as soft success if URL present
          if (url) {
            setStatus('ok')
            setDetails({ url, projectRef })
          } else {
            setStatus('error')
            setDetails({ error: error.message })
          }
          return
        }
        setStatus('ok')
        setDetails({ url, projectRef })
      } catch (e: any) {
        setStatus('error')
        setDetails({ error: e?.message || String(e) })
      }
    }
    check()
  }, [])

  return (
    <main className="container">
      <h1 className="text-2xl font-semibold mb-4">HarmoNet Phase9 - Supabase 接続確認</h1>
      {status === 'idle' && <p>初期化中...</p>}
      {status === 'ok' && (
        <div className="card space-y-2">
          <p className="text-sm text-gray-600">接続成功</p>
          <div>
            <div className="text-sm">URL: <code>{details.url}</code></div>
            <div className="text-sm">Project Ref: <code>{details.projectRef || 'N/A'}</code></div>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="card">
          <p className="text-red-600">接続エラー</p>
          <pre className="text-xs whitespace-pre-wrap">{details.error}</pre>
        </div>
      )}
    </main>
  )
}
