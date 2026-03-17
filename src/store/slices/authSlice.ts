import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { getStoredToken, removeSessionStorage, setStoredToken } from '@/utils/storage';

interface AuthState {
  token: string;
  loginLoading: boolean;
}

const initialState: AuthState = {
  token: getStoredToken(),
  loginLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      setStoredToken(action.payload);
    },
    setLoginLoading(state, action: PayloadAction<boolean>) {
      state.loginLoading = action.payload;
    },
    clearAuth(state) {
      state.token = '';
      state.loginLoading = false;
      removeSessionStorage();
    },
  },
});

export const { setToken, setLoginLoading, clearAuth } = authSlice.actions;
export default authSlice.reducer;
