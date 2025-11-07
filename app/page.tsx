'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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
    <main style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem'
    }}>
      <div style={{ 
        maxWidth: '28rem', 
        width: '100%', 
        textAlign: 'center',
        padding: '2rem',
        borderRadius: '0.5rem',
        backgroundColor: 'var(--background)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ 
          fontSize: '1.875rem', 
          fontWeight: 'bold', 
          marginBottom: '1rem',
          color: 'var(--foreground)'
        }}>
          HarmoNet
        </h1>
        
        <p style={{ marginBottom: '2rem', opacity: 0.7 }}>
          Phase9 Next.js 初期化完了
        </p>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ 
            padding: '1rem', 
            borderRadius: '0.5rem', 
            backgroundColor: 'rgba(128,128,128,0.1)'
          }}>
            <h2 style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
              Supabase接続ステータス
            </h2>
            
            {connectionStatus === 'checking' && (
              <p style={{ opacity: 0.7 }}>接続確認中...</p>
            )}
            
            {connectionStatus === 'connected' && (
              <p style={{ color: 'green', fontWeight: '500' }}>✅ 接続成功</p>
            )}
            
            {connectionStatus === 'error' && (
              <div style={{ color: 'red' }}>
                <p style={{ fontWeight: '500' }}>❌ 接続エラー</p>
                <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.7 }}>
                  {errorMessage}
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={checkConnection}
            style={{
              width: '100%',
              padding: '0.75rem',
              marginTop: '1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '0.375rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500'
            }}
          >
            再接続テスト
          </button>
        </div>

        <div style={{ 
          marginTop: '2rem', 
          paddingTop: '1.5rem', 
          borderTop: '1px solid rgba(128,128,128,0.2)',
          fontSize: '0.875rem',
          opacity: 0.7
        }}>
          <p>Next.js 16.0.1 | React 19.0.0 | Supabase</p>
          <p style={{ marginTop: '0.25rem' }}>ローカル開発環境 (Port 3000)</p>
        </div>
      </div>
    </main>
  )
}