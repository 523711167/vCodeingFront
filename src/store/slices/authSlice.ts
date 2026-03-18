import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  getStoredToken,
  getStoredTokenType,
  removeSessionStorage,
  setStoredAuthSession,
  type StoredAuthSession,
} from '@/utils/storage';

interface AuthState {
  // token 是业务路由是否可进入的基础判断条件。
  token: string;
  // tokenType 保留在 store 里，是为了后续如果出现 MAC、DPoP 等不同认证方案时
  // UI 层和请求层能基于同一份状态排查问题。
  tokenType: string;
  // loginLoading 只描述“登录动作”本身，不承担全局 loading。
  loginLoading: boolean;
}

const initialState: AuthState = {
  // 初始化时直接从 localStorage 恢复 token，支持刷新后保留登录态。
  token: getStoredToken(),
  tokenType: getStoredTokenType(),
  loginLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthSession(state, action: PayloadAction<StoredAuthSession>) {
      state.token = action.payload.accessToken;
      state.tokenType = action.payload.tokenType;
      // 认证状态更新和本地持久化放在同一个 action 中，
      // 是为了让登录、刷新、恢复三条链路始终共用同一份会话格式。
      setStoredAuthSession(action.payload);
    },
    setLoginLoading(state, action: PayloadAction<boolean>) {
      state.loginLoading = action.payload;
    },
    clearAuth(state) {
      state.token = '';
      state.tokenType = 'Bearer';
      state.loginLoading = false;
      // clearAuth 是“登录态退出”的统一入口，所有相关缓存都在这里回收。
      removeSessionStorage();
    },
  },
});

export const { setAuthSession, setLoginLoading, clearAuth } = authSlice.actions;
export default authSlice.reducer;
