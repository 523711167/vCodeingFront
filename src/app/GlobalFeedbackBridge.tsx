import { App as AntdApp } from 'antd';
import { useEffect } from 'react';
import { setGlobalMessageInstance } from '@/services/error-message';

function GlobalFeedbackBridge() {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    // 统一把 AntdApp 注入的 message 实例桥接给请求层和通用服务。
    // 这样组件外部触发的业务错误，也能复用和页面内一致的提示体系。
    setGlobalMessageInstance(message);
  }, [message]);

  return null;
}

export default GlobalFeedbackBridge;
