import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

type ProjectConfig = UserConfig & { test?: Record<string, unknown> };

const config: ProjectConfig = {
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // ── مكتبات ثقيلة — كل واحدة في chunk لوحدها ──────────────────
          if (id.includes('node_modules/xlsx'))         return 'vendor-xlsx';
          if (id.includes('node_modules/pdfjs-dist'))   return 'vendor-pdf';
          if (id.includes('node_modules/mammoth'))      return 'vendor-mammoth';

          // ── dnd-kit — بيتحمل بس لما Dialog الإنشاء/التعديل يتفتح ─────
          if (id.includes('node_modules/@dnd-kit'))     return 'vendor-dnd';

          // ── React core — أول حاجة تتحمل وبقى cached دايمًا ───────────
          if (id.includes('node_modules/react-dom'))    return 'vendor-react';
          if (id.includes('node_modules/react/'))       return 'vendor-react';

          // ── React Query ───────────────────────────────────────────────
          if (id.includes('node_modules/@tanstack'))    return 'vendor-query';

          // ── Radix UI (أكبر مجموعة مكتبات) ────────────────────────────
          if (id.includes('node_modules/@radix-ui'))    return 'vendor-radix';

          // ── Lucide icons ──────────────────────────────────────────────
          if (id.includes('node_modules/lucide-react')) return 'vendor-icons';

          // ── axios + باقي الـ utilities ────────────────────────────────
          if (id.includes('node_modules/axios'))        return 'vendor-axios';
        },
      },
    },
    // تحذير أكبر من 800kB فقط
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
};

export default defineConfig(config);