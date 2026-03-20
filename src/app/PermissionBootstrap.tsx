import { useEffect, useRef } from 'react';
import axios from 'axios';
import { fetchCurrentPermissionPayload } from '@/services/auth.service';
import { showErrorMessageOnce } from '@/services/error-message';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuth } from '@/store/slices/authSlice';
import {
  clearPermission,
  setPermissionPayload,
} from '@/store/slices/permissionSlice';

function PermissionBootstrap() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const tokenType = useAppSelector((state) => state.auth.tokenType);
  const latestSyncedTokenRef = useRef('');

  useEffect(() => {
    if (!token) {
      latestSyncedTokenRef.current = '';
      return;
    }

    // 权限缓存会落 localStorage，如果后端菜单变了但用户没有重新登录，
    // 页面就会继续使用旧菜单。这里在应用启动和 token 变化时主动同步一次。
    if (latestSyncedTokenRef.current === token) {
      return;
    }

    let cancelled = false;

    fetchCurrentPermissionPayload({
      accessToken: token,
      tokenType,
    })
      .then((payload) => {
        if (cancelled) {
          return;
        }

        latestSyncedTokenRef.current = token;
        dispatch(setPermissionPayload(payload));
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        // 只有登录态已经失效时才清理本地会话；
        // 普通网络抖动不强制把用户踢回登录页，避免刷新页面时体验过于激进。
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          dispatch(clearAuth());
          dispatch(clearPermission());
          showErrorMessageOnce(error, '登录状态已失效，请重新登录');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, token, tokenType]);

  return null;
}

export default PermissionBootstrap;
