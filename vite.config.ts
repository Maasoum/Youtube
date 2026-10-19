import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// سرور توسعه روی همه‌ی اینترفیس‌ها گوش می‌دهد تا پیش‌نمایش محیط ابری قابل دسترسی باشد.
export default defineConfig({
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
  },
  preview: {
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
