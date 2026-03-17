import { configureStore } from '@reduxjs/toolkit';
import appReducer from '@/store/slices/appSlice';
import authReducer from '@/store/slices/authSlice';
import permissionReducer from '@/store/slices/permissionSlice';

// store 只收纳“跨页面共享”的状态。
// 页面局部表单、弹窗开关这类短生命周期状态，仍然建议放在组件内部。
export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    permission: permissionReducer,
  },
});

// 统一导出 RootState / AppDispatch，方便 hooks 和 thunk 复用推导类型。
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
