import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { createQueryClient, QueryClientProvider } from '@/hooks/useMessagePagination'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import * as Sentry from '@sentry/react';
import './index.css'

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
});

const queryClient = createQueryClient()

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>,
)
