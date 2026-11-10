import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import App from '@/App'
import '@/index.css'

// MSW reads its cookie store during import, before application preference guards can run.
function prepareMockStorage() {
  try {
    window.localStorage.getItem('__msw-cookie-store__')
    return
  } catch {
    const values = new Map<string, string>()
    const storage: Storage = {
      get length() {
        return values.size
      },
      clear() {
        values.clear()
      },
      getItem(key) {
        return values.get(String(key)) ?? null
      },
      key(index) {
        return Array.from(values.keys())[index] ?? null
      },
      removeItem(key) {
        values.delete(String(key))
      },
      setItem(key, value) {
        values.set(String(key), String(value))
      },
    }
    Object.defineProperty(window, 'localStorage', {configurable: true, value: storage})
  }
}

async function enableMocking() {
  prepareMockStorage()
  const {worker} = await import('@/mocks/browser')
  const workerUrl = `${import.meta.env.BASE_URL}mockServiceWorker.js`
  await navigator.serviceWorker.register(workerUrl)
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {url: workerUrl},
  })
}

async function bootstrap() {
  try {
    await enableMocking()
  } catch (error) {
    // Render anyway so the error is visible instead of a blank page.
    console.error('Mock API failed to start. Check that public/mockServiceWorker.js exists.', error)
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {staleTime: 30_000, retry: 1},
    },
  })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void bootstrap()
