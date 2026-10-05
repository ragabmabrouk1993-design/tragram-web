"use client";

import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import type { User } from "@/lib/api-client";

export type AuthUser = Omit<User, "createdAt"> & {
    createdAt?: string;
};

const formatDate = (value?: Date | string) => {
    if (!value) return undefined;
    return value instanceof Date ? value.toISOString() : value;
};

export const normalizeUserForStore = (user?: User | null): AuthUser | null => {
    if (!user) return null;
    const { createdAt, ...rest } = user;
    return {
        ...rest,
        createdAt: formatDate(createdAt),
    };
};

interface AuthState {
    status: "checking" | "authenticated" | "guest";
    user: AuthUser | null;
    accessToken: string | null;
    refreshToken: string | null;
}

const initialState: AuthState = {
    status: "checking",
    user: null,
    accessToken: null,
    refreshToken: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setTokens(
            state,
            action: PayloadAction<{ accessToken: string | null; refreshToken: string | null }>
        ) {
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
        },
        setUser(state, action: PayloadAction<AuthUser | null>) {
            state.user = action.payload;
            state.status = action.payload ? "authenticated" : "guest";
        },
        setStatus(state, action: PayloadAction<AuthState["status"]>) {
            state.status = action.payload;
        },
        setAuth(
            state,
            action: PayloadAction<{ user: AuthUser; accessToken: string; refreshToken: string }>
        ) {
            state.user = action.payload.user;
            state.accessToken = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            state.status = "authenticated";
        },
        clearAuth(state) {
            state.user = null;
            state.accessToken = null;
            state.refreshToken = null;
            state.status = "guest";
        },
    },
});

export const { setTokens, setUser, setStatus, setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
