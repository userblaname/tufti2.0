import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { createQueryClient, QueryClientProvider } from '@/hooks/useMessagePagination'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import './index.css'

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
