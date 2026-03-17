import { configureStore } from '@reduxjs/toolkit';
import appReducer from '@/store/slices/appSlice';
import authReducer from '@/store/slices/authSlice';
import permissionReducer from '@/store/slices/permissionSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    auth: authReducer,
    permission: permissionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
