import { message } from 'antd';
import type { MessageInstance } from 'antd/es/message/interface';

const ERROR_MESSAGE_SHOWN_FLAG = '__vcodeing_error_message_shown__';
let globalMessageInstance: MessageInstance | null = null;

interface ErrorWithShownFlag {
  [ERROR_MESSAGE_SHOWN_FLAG]?: boolean;
}

export function setGlobalMessageInstance(instance: MessageInstance) {
  // 请求层、权限恢复、modal confirm 的异步回调都运行在 React 组件外部。
  // 这里把 AntdApp 的 message 实例提升为全局单例，保证这些链路也能稳定弹出提示。
  globalMessageInstance = instance;
}

export function getErrorMessage(
  error: unknown,
  fallbackMessage = '操作失败，请稍后重试',
) {
  // 页面层和请求层统一走这一个错误文案提取入口，
  // 这样无论是后端业务错误、网络错误还是手动 throw Error，最终提示都一致。
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return fallbackMessage;
}

export function hasShownErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return Boolean((error as ErrorWithShownFlag)[ERROR_MESSAGE_SHOWN_FLAG]);
}

export function markErrorMessageShown(error: unknown) {
  if (!error || typeof error !== 'object') {
    return;
  }

  Object.defineProperty(error, ERROR_MESSAGE_SHOWN_FLAG, {
    configurable: true,
    enumerable: false,
    value: true,
    writable: true,
  });
}

export function showErrorMessageOnce(
  error: unknown,
  fallbackMessage = '操作失败，请稍后重试',
) {
  const nextMessage = getErrorMessage(error, fallbackMessage);

  // 请求层已经提示过的错误不应该在页面 catch 里再次弹出，否则用户会看到重复提示。
  if (!hasShownErrorMessage(error)) {
    (globalMessageInstance ?? message).error(nextMessage);
    markErrorMessageShown(error);
  }

  return nextMessage;
}
