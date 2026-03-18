import { useEffect, useEffectEvent, useRef } from 'react';
import { message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { logout } from '@/services/auth.service';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuth } from '@/store/slices/authSlice';
import { clearPermission } from '@/store/slices/permissionSlice';

const IDLE_TIMEOUT_MS = Number(
  import.meta.env.VITE_IDLE_LOGOUT_MS ?? 5 * 60 * 1000,
);

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  'click',
  'focus',
  'keydown',
  'mousedown',
  'mousemove',
  'scroll',
  'touchstart',
];

function SessionIdleGuard() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const timerRef = useRef<number | null>(null);

  const clearIdleTimer = useEffectEvent(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  });

  const handleTimeoutLogout = useEffectEvent(async () => {
    try {
      // 超时退出和手动退出共用同一条服务端撤销逻辑，
      // 是为了保证令牌回收策略一致，避免留下仍可使用的 access token。
      await logout();
    } finally {
      dispatch(clearAuth());
      dispatch(clearPermission());
      message.warning('已超过 5 分钟未操作，系统已自动退出');
      navigate('/login', { replace: true });
    }
  });

  const resetIdleTimer = useEffectEvent(() => {
    clearIdleTimer();

    // 定时器只在“已登录”状态下运行，避免登录页空转监听和误触发退出流程。
    if (!token) {
      return;
    }

    timerRef.current = window.setTimeout(() => {
      void handleTimeoutLogout();
    }, IDLE_TIMEOUT_MS);
  });

  useEffect(() => {
    if (!token) {
      clearIdleTimer();
      return;
    }

    // 整个应用只挂一组全局监听，是为了让任意页面的用户活动都能重置会话时钟。
    // 如果后续要接更精细的空闲策略，例如弹出续期确认框，可以从这里继续扩展。
    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });

    resetIdleTimer();

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
      clearIdleTimer();
    };
  }, [clearIdleTimer, resetIdleTimer, token]);

  return null;
}

export default SessionIdleGuard;
