'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { School as SchoolIcon } from 'lucide-react'
import { ThemeProvider } from '@/components/theme-provider'
import { api, ApiClientError } from '@/lib/api-client'
import type { AuthUser } from '@/types/school'
import { AppShell } from './app-shell'
import { LoginView } from './login-view'

function BootSplash() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <div className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-emerald-600">
        <SchoolIcon className="h-7 w-7 text-white" />
      </div>
      <p className="text-sm text-muted-foreground">Loading Nejo preparatory School Academy…</p>
    </div>
  )
}

export function SchoolApp() {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) => {
              if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) return false
              return failureCount < 2
            },
            refetchOnWindowFocus: false,
            staleTime: 10_000,
          },
        },
      }),
  )
  const [user, setUser] = React.useState<AuthUser | null>(null)
  const [booting, setBooting] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    api
      .get<AuthUser>('/api/auth/me')
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        if (!cancelled) setUser(null)
      })
      .finally(() => {
        if (!cancelled) setBooting(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleLogin = React.useCallback(
    (nextUser: AuthUser) => {
      queryClient.clear()
      setUser(nextUser)
    },
    [queryClient],
  )

  const handleLogout = React.useCallback(() => {
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  if (booting) return <BootSplash />

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        {user ? <AppShell user={user} onLogout={handleLogout} /> : <LoginView onSuccess={handleLogin} />}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
