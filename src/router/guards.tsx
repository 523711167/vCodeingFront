import type { PropsWithChildren } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

export function AuthGuard({ children }: PropsWithChildren) {
  const token = useAppSelector((state) => state.auth.token);
  const location = useLocation();

  if (!token) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  return children;
}
