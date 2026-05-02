// Node modules
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

// Css
import './index.css';
// Router
import router from '@/routes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // البيانات تُعتبر طازجة 5 دقايق قبل ما تعمل background refetch
      staleTime: 1000 * 60 * 5,
    },
  },
});

// يحفظ الـ cache في localStorage - كل refresh بيبقى فوري
const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'security-portal-cache',
  // بعد 24 ساعة يمسح الـ cache القديم
  throttleTime: 1000,
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24, // 24 ساعة
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            // نحفظ اللي اتجاب بنجاح: دفاتر + سنوات + دفعات + وثائق
            query.state.status === 'success' &&
            ['notebooks', 'notebook', 'years', 'batches', 'documents'].some(k =>
              Array.isArray(query.queryKey) && query.queryKey[0] === k
            ),
        },
      }}
    >
      <TooltipProvider>
        <AuthProvider>
          <ThemeProvider>
            <Toaster />
            <Sonner />
            <RouterProvider router={router} />
          </ThemeProvider>
        </AuthProvider>
      </TooltipProvider>
    </PersistQueryClientProvider>
  </StrictMode>,
)
