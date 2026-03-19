import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080';
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
        // 业务接口同样走本地代理，是为了让用户管理页在浏览器里联调时
        // 不会因为后端未单独配置 CORS 而被跨域拦截。
        '/api': {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          target: apiTarget,
        },
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
