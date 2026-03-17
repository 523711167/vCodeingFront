import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/store';

// 项目内部统一使用这两个 hooks，避免每个页面都重复写类型声明。
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
