import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

export function AuthGuard({ children }: PropsWithChildren) {
  const token = useAppSelector((state) => state.auth.token);
  const location = useLocation();

  if (!token) {
    // 记录 from 信息，后续如果要做“登录后跳回原页面”，可以直接用这里的 state。
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}
