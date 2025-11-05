'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.from('tenants').select('count').single()
      
      if (error) {
        console.error('Supabase接続エラー:', error)
        setConnectionStatus('error')
        setErrorMessage(error.message)
      } else {
        setConnectionStatus('connected')
      }
    } catch (err) {
      console.error('予期しないエラー:', err)
      setConnectionStatus('error')
      setErrorMessage(err instanceof Error ? err.message : '不明なエラー')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="card max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-4 text-foreground">
          HarmoNet
        </h1>
        
        <p className="text-muted mb-8">
          Phase9 Next.js 初期化完了
        </p>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-secondary">
            <h2 className="font-semibold mb-2">Supabase接続ステータス</h2>
            
            {connectionStatus === 'checking' && (
              <p className="text-muted">接続確認中...</p>
            )}
            
            {connectionStatus === 'connected' && (
              <p className="text-green-600 font-medium">✅ 接続成功</p>
            )}
            
            {connectionStatus === 'error' && (
              <div className="text-red-600">
                <p className="font-medium">❌ 接続エラー</p>
                <p className="text-sm mt-2 text-muted-foreground">
                  {errorMessage}
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={checkConnection}
            className="btn-primary w-full"
          >
            再接続テスト
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-secondary text-sm text-muted">
          <p>Next.js 15.5.x | React 19.0.0 | Supabase</p>
          <p className="mt-1">ローカル開発環境 (Port 3000)</p>
        </div>
      </div>
    </main>
  )
}