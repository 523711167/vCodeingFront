import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import Providers from '@/app/providers';
import '@/styles/global.css';

// 应用只在这里执行一次挂载。
// 后续如果需要接入埋点、Sentry、全局错误恢复等初始化逻辑，也通常从这里进入。
ReactDOM.createRoot(document.getElementById('root')!).render(
  <Providers>
    <App />
  </Providers>,
);
