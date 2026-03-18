import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const oauthTarget = env.VITE_OAUTH_PROXY_TARGET || 'http://127.0.0.1:8080';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        // OAuth2 请求通过 Vite 开发代理转发到本地后端，
        // 这样浏览器看到的始终是同源地址，联调时不会再触发 CORS 拦截。
        '/oauth-proxy': {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/oauth-proxy/, ''),
          target: oauthTarget,
        },
      },
    },
  };
});
