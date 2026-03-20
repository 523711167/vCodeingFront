import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PermissionPayload } from '@/services/auth.service';
import {
  getStoredPermissionPayload,
  removePermissionPayload,
  setStoredPermissionPayload,
} from '@/utils/storage';

interface PermissionState {
  // user 保存当前登录用户及其权限原始数据，后续页面展示个人信息会直接使用。
  user: PermissionPayload | null;
  // buttonCodes 专门用于按钮级权限判断。
  buttonCodes: string[];
}

function getInitialState(): PermissionState {
  const payload = getStoredPermissionPayload();

  return {
    user: payload,
    buttonCodes: payload?.buttons ?? [],
  };
}

const permissionSlice = createSlice({
  name: 'permission',
  initialState: getInitialState(),
  reducers: {
    setPermissionPayload(state, action: PayloadAction<PermissionPayload>) {
      state.user = action.payload;
      state.buttonCodes = action.payload.buttons;
      // 权限数据持久化后，刷新页面时仍然能直接恢复菜单和按钮权限。
      setStoredPermissionPayload(action.payload);
    },
    clearPermission(state) {
      state.user = null;
      state.buttonCodes = [];
      // 权限必须和登录态一起回收，否则很容易出现脏菜单。
      removePermissionPayload();
    },
  },
});

export const { setPermissionPayload, clearPermission } = permissionSlice.actions;
export default permissionSlice.reducer;
