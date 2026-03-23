import type { PropsWithChildren } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import GlobalFeedbackBridge from '@/app/GlobalFeedbackBridge';
import PermissionBootstrap from '@/app/PermissionBootstrap';
import SessionIdleGuard from '@/app/SessionIdleGuard';
import { store } from '@/store';

function Providers({ children }: PropsWithChildren) {
  return (
    // Redux Provider 放在最外层，让整个应用树都能读写全局状态。
    <Provider store={store}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          // 这里先放一组项目级主题 token。
          // 后续如果接设计系统，可以继续在这里集中扩展颜色、圆角、字号等设计变量。
          token: {
            colorPrimary: '#1668dc',
            borderRadius: 12,
          },
        }}
      >
        {/* AntdApp 用来承接 message、modal 等全局能力。 */}
        <AntdApp>
          {/* 全局反馈桥接器负责把 AntdApp 的 message 实例暴露给请求层，
              这样组件外部抛出的错误也能稳定显示提示。 */}
          <GlobalFeedbackBridge />
          {/* 路由容器放在 Provider 内部，确保页面切换过程中仍然能访问 store。 */}
          <BrowserRouter>
            {/* 权限自恢复负责在页面刷新后重新向后端同步当前菜单和按钮权限，
                避免 localStorage 里的旧权限把最新菜单结构覆盖掉。 */}
            <PermissionBootstrap />
            {/* 空闲会话守卫必须放在路由容器内部，
                这样自动退出后才能直接跳回登录页。 */}
            <SessionIdleGuard />
            {children}
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </Provider>
  );
}

export default Providers;
