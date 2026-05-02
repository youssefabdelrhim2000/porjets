import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext.tsx";

// Lazy load pages
const Index        = lazy(() => import("./pages/Index"));
const NotFound     = lazy(() => import("./pages/NotFound"));
const LoginForm    = lazy(() => import("./components/LoginForm"));
const DocumentsPage= lazy(() => import("./pages/DocumentsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // لو السيرفر رجع error، متحاولش تاني أوتوماتيك أكتر من مرة
      retry: 1,
      // مش بيعيد الـ fetch لما المستخدم يرجع للتاب
      refetchOnWindowFocus: false,
    },
  },
});

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Protected Route
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading)          return <PageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

// Public Route (صفحة اللوجن بس)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading)        return <PageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        {/*
          FIX: ThemeProvider جوا AuthProvider عشان الـ /api/settings/theme
          مش يتبعت قبل ما المستخدم يعمل login - كان سبب الـ 500 error
        */}
        <ThemeProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* صفحة الدخول */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginForm />
                    </PublicRoute>
                  }
                />

                {/* الصفحة الرئيسية */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />

                {/* صفحة الوثائق */}
                <Route
                  path="/documents"
                  element={
                    <ProtectedRoute>
                      <DocumentsPage />
                    </ProtectedRoute>
                  }
                />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;