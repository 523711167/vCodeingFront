import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getStoredToken, removeSessionStorage, setStoredToken } from '@/utils/storage';

interface AuthState {
  // token 是业务路由是否可进入的基础判断条件。
  token: string;
  // loginLoading 只描述“登录动作”本身，不承担全局 loading。
  loginLoading: boolean;
}

const initialState: AuthState = {
  // 初始化时直接从 localStorage 恢复 token，支持刷新后保留登录态。
  token: getStoredToken(),
  loginLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      // 状态更新和本地持久化在同一个 action 内完成，
      // 避免页面层记得 dispatch 却忘了写入缓存。
      setStoredToken(action.payload);
    },
    setLoginLoading(state, action: PayloadAction<boolean>) {
      state.loginLoading = action.payload;
    },
    clearAuth(state) {
      state.token = '';
      state.loginLoading = false;
      // clearAuth 是“登录态退出”的统一入口，所有相关缓存都在这里回收。
      removeSessionStorage();
    },
  },
});

export const { setToken, setLoginLoading, clearAuth } = authSlice.actions;
export default authSlice.reducer;
