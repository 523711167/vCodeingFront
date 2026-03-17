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
  // routeAuthCodes 是已经拍平后的“可访问页面权限码集合”，
  // 路由层只读它，不直接解析后端返回结构。
  routeAuthCodes: string[];
  // buttonCodes 专门用于按钮级权限判断。
  buttonCodes: string[];
}

function getInitialState(): PermissionState {
  const payload = getStoredPermissionPayload();

  return {
    user: payload,
    routeAuthCodes: payload
      ? [
          // 一级菜单权限码。
          ...payload.menus.map((menu) => menu.authCode),
          // 二级页面权限码。
          ...payload.menus.flatMap((menu) =>
            menu.children?.map((child) => child.authCode) ?? [],
          ),
          // 当前示例项目里，新增/编辑表单页走独立隐藏路由。
          // 这里先人工补齐这两个权限码，确保演示流程完整可访问。
          'content:form:view',
          'operation:form:view',
        ]
      : [],
    buttonCodes: payload?.buttons ?? [],
  };
}

const permissionSlice = createSlice({
  name: 'permission',
  initialState: getInitialState(),
  reducers: {
    setPermissionPayload(state, action: PayloadAction<PermissionPayload>) {
      state.user = action.payload;
      state.routeAuthCodes = [
        ...action.payload.menus.map((menu) => menu.authCode),
        ...action.payload.menus.flatMap(
          (menu) => menu.children?.map((child) => child.authCode) ?? [],
        ),
        'content:form:view',
        'operation:form:view',
      ];
      state.buttonCodes = action.payload.buttons;
      // 权限数据持久化后，刷新页面时仍然能直接恢复菜单和按钮权限。
      setStoredPermissionPayload(action.payload);
    },
    clearPermission(state) {
      state.user = null;
      state.routeAuthCodes = [];
      state.buttonCodes = [];
      // 权限必须和登录态一起回收，否则很容易出现脏菜单。
      removePermissionPayload();
    },
  },
});

export const { setPermissionPayload, clearPermission } = permissionSlice.actions;
export default permissionSlice.reducer;
