import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: false,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  base: "/",
  plugins: [
    react(),
    // removeConsole plugin desabilitado temporariamente para evitar erros de transformação
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Ensure environment variables are available at build time
    __VITE_SUPABASE_URL__: JSON.stringify(process.env.VITE_SUPABASE_URL),
    __VITE_SUPABASE_ANON_KEY__: JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
    __VITE_APP_NAME__: JSON.stringify(process.env.VITE_APP_NAME),
    __VITE_WHATSAPP_NUMBER__: JSON.stringify(process.env.VITE_WHATSAPP_NUMBER),
    __VITE_ADMIN_EMAIL__: JSON.stringify(process.env.VITE_ADMIN_EMAIL),
  },
}));
