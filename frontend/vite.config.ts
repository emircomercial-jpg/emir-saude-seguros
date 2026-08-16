import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// PWA (secção 23 do briefing): manifesto, ícones, cor do tema, Service
// Worker com cache do "shell" da aplicação (HTML/CSS/JS) e página offline.
// Nenhuma resposta sensível da API é armazenada indiscriminadamente pelo
// Service Worker — apenas os recursos estáticos da aplicação; os dados de
// referência para uso offline (dashboard, definições, permissões, perfil)
// são geridos explicitamente pelo IndexedDB (ver src/offline/cacheService.ts),
// nunca pelo cache do Service Worker.
export default defineConfig({
  // Alvo de compilação: cobre Chrome/Edge 87+, Firefox 78+, Safari 14+ e
  // equivalentes móveis (essencialmente todos os browsers em uso normal
  // desde 2021) — sem incluir polyfills pesados para browsers
  // verdadeiramente obsoletos, que aumentariam o tamanho do pacote para
  // todos só para servir uma fracção mínima de utilizadores.
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        // Separa as bibliotecas externas do código da aplicação. Estas
        // mudam muito menos vezes do que o código próprio — assim, quando
        // publicamos uma pequena correcção, o browser só descarrega de
        // novo o pedaço pequeno que mudou, não o React inteiro outra vez.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'EMIR SAÚDE SEGUROS',
        short_name: 'EMIR Saúde',
        description: 'Gestão profissional de seguros de saúde — EMIR PHARMA JULIETA LDA',
        lang: 'pt-PT',
        theme_color: '#0F4C81',
        background_color: '#F4F6F8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/offline.html',
        navigateFallbackDenylist: [/^\/api/],
        runtimeCaching: [
          {
            // Apenas pedidos de LEITURA (GET) à API podem cair para cache em
            // caso de falha de rede; escritas (POST/PATCH/DELETE) nunca são
            // interceptadas pelo Service Worker — seguem sempre para a rede,
            // falhando explicitamente se não houver ligação (nunca uma
            // confirmação offline enganosa de uma operação crítica).
            urlPattern: ({ url, request }) => url.pathname.startsWith('/api') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'emir-api-get-cache',
              networkTimeoutSeconds: 5,
              cacheableResponse: { statuses: [200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: Number(process.env.FRONTEND_PORT) || 5173,
  },
});
