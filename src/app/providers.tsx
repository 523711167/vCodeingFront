import type { PropsWithChildren } from 'react';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from '@/store';

function Providers({ children }: PropsWithChildren) {
  return (
    <Provider store={store}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          token: {
            colorPrimary: '#1668dc',
            borderRadius: 12,
          },
        }}
      >
        <AntdApp>
          <BrowserRouter>{children}</BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </Provider>
  );
}

export default Providers;
