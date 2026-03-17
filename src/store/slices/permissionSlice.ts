import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PermissionPayload } from '@/services/auth.service';
import {
  getStoredPermissionPayload,
  removePermissionPayload,
  setStoredPermissionPayload,
} from '@/utils/storage';

interface PermissionState {
  user: PermissionPayload | null;
  routeAuthCodes: string[];
  buttonCodes: string[];
}

function getInitialState(): PermissionState {
  const payload = getStoredPermissionPayload();

  return {
    user: payload,
    routeAuthCodes: payload
      ? [
          ...payload.menus.map((menu) => menu.authCode),
          ...payload.menus.flatMap((menu) =>
            menu.children?.map((child) => child.authCode) ?? [],
          ),
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
      setStoredPermissionPayload(action.payload);
    },
    clearPermission(state) {
      state.user = null;
      state.routeAuthCodes = [];
      state.buttonCodes = [];
      removePermissionPayload();
    },
  },
});

export const { setPermissionPayload, clearPermission } = permissionSlice.actions;
export default permissionSlice.reducer;
