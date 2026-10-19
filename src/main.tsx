import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import App from "./App";
import "./index.css";
import { brand } from "@/config/brand";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

document.title = `${brand.nameFa} | دوره‌های هوش مصنوعی برای کودکان`;
document
  .querySelector('meta[name="description"]')
  ?.setAttribute("content", brand.description);

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("عنصر ریشه‌ی برنامه پیدا نشد.");
}

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <MotionConfig reducedMotion="user">
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </MotionConfig>
    </BrowserRouter>
  </StrictMode>,
);
