"use client";

import { PayloadAction, createSlice } from "@reduxjs/toolkit";

type Theme = "dark";

interface UIState {
  theme: Theme;
  crispMobileDismissed: boolean;
  crispMobileChatOpen: boolean;
  referralCode: string | null;
  dismissedTelegramReconnectToastKeys: Record<string, true>;
}

const initialState: UIState = {
  theme: "dark",
  crispMobileDismissed: false,
  crispMobileChatOpen: false,
  referralCode: null,
  dismissedTelegramReconnectToastKeys: {},
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = "dark";
    },
    dismissCrispMobile(state) {
      state.crispMobileDismissed = true;
      state.crispMobileChatOpen = false;
    },
    openCrispMobile(state) {
      state.crispMobileDismissed = false;
      state.crispMobileChatOpen = true;
    },
    closeCrispMobile(state) {
      state.crispMobileChatOpen = false;
    },
    setReferralCode(state, action: PayloadAction<string | null>) {
      const nextCode = action.payload?.trim() || null;
      state.referralCode = nextCode;
    },
    clearReferralCode(state) {
      state.referralCode = null;
    },
    dismissTelegramReconnectToast(state, action: PayloadAction<string>) {
      const key = action.payload.trim();
      if (key) {
        state.dismissedTelegramReconnectToastKeys[key] = true;
      }
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  dismissCrispMobile,
  openCrispMobile,
  closeCrispMobile,
  setReferralCode,
  clearReferralCode,
  dismissTelegramReconnectToast,
} = uiSlice.actions;
export type { Theme };
export default uiSlice.reducer;
