import { createSlice } from '@reduxjs/toolkit';

interface AppState {
  siderCollapsed: boolean;
}

const initialState: AppState = {
  siderCollapsed: false,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    toggleSider(state) {
      state.siderCollapsed = !state.siderCollapsed;
    },
  },
});

export const { toggleSider } = appSlice.actions;
export default appSlice.reducer;
