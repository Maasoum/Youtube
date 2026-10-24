import { defineConfig } from "vitest/config";

const encryptionKey = Buffer.alloc(32, 7).toString("base64");

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: "forks",
    env: {
      NODE_ENV: "test",
      PORT: "3000",
      HOST: "127.0.0.1",
      APP_URL: "http://localhost:5173",
      PUBLIC_API_URL: "http://localhost:3000",
      DATABASE_URL: "postgres://test:test@127.0.0.1:5432/brightpaths_test",
      SESSION_SECRET: "test-session-secret-0123456789abcdef",
      ENCRYPTION_KEY: encryptionKey,
      ENCRYPTION_KEY_ID: "v1",
      ADMIN_EMAIL: "admin@example.com",
      ADMIN_ALERT_EMAIL: "alerts@example.com",
      COOKIE_SECURE: "false",
      TRUST_PROXY: "false",
      LOG_LEVEL: "silent",
      PAYPING_TOKEN: "",
    },
  },
});
