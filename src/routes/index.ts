import { createBrowserRouter, redirect } from "react-router-dom";
import { lazy } from "react";

// ── Lazy Pages ────────────────────────────────────────────────────────────────
const Index        = lazy(() => import("@/pages/Index"));
const NotFound     = lazy(() => import("@/pages/NotFound"));
const LoginForm    = lazy(() => import("@/components/LoginForm"));
const DocumentsPage= lazy(() => import("@/pages/DocumentsPage"));

// ── Auth Helper ───────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("token");
}

// ── Guards (بدل ProtectedRoute و PublicRoute) ─────────────────────────────────

/** الصفحات اللي محتاجة login */
async function requireAuth() {
  if (!getToken()) throw redirect("/login");
  return null;
}

/** صفحة الـ login — لو اتسجّل يروح للـ home */
async function requireGuest() {
  if (getToken()) throw redirect("/");
  return null;
}

// ── Router ────────────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  // Login
  {
    path: "/login",
    loader: requireGuest,
    Component: LoginForm,
  },

  // Protected pages
  {
    loader: requireAuth,           // ← بيحمي كل الـ children دفعة واحدة
    children: [
      {
        path: "/",
        Component: Index,
      },
      {
        path: "/documents",
        Component: DocumentsPage,
      },
    ],
  },

  // 404
  {
    path: "*",
    Component: NotFound,
  },
]);

export default router;