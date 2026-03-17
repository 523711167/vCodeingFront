import AppRouter from '@/router/AppRouter';

function App() {
  // App 只负责承接路由层，不承担业务状态和布局逻辑。
  // 这样结构会比较稳定，后续扩展全局能力也不会把入口组件弄得太重。
  return <AppRouter />;
}

export default App;
