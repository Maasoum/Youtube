import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// سرور توسعه روی همه‌ی اینترفیس‌ها گوش می‌دهد تا پیش‌نمایش محیط ابری قابل دسترسی باشد.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  /**
   * در توسعه، درخواست‌های `/api` به بک‌اند Fastify هدایت می‌شوند تا کوکی
   * نشست هم‌مبدأ بماند و نیازی به CORS نباشد. در production، nginx همین
   * نقش را انجام می‌دهد.
   */
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3000";
  const proxy = {
    "/api": {
      target: apiTarget,
      changeOrigin: true,
    },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": new URL("./src", import.meta.url).pathname,
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: false,
      allowedHosts: true,
      hmr: {
        clientPort: 443,
      },
      proxy,
    },
    preview: {
      host: "0.0.0.0",
      allowedHosts: true,
      proxy,
    },
  };
});
