import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

const storedUser = (() => {
  try {
    return JSON.parse(localStorage.getItem("cbt_user"));
  } catch {
    return null;
  }
})();

const persistSession = (data) => {
  localStorage.setItem("cbt_access_token", data.accessToken);
  localStorage.setItem("cbt_refresh_token", data.refreshToken);
  localStorage.setItem("cbt_user", JSON.stringify(data.user));
};

export const login = createAsyncThunk("auth/login", async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/login", payload);
    persistSession(data);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Login failed");
  }
});

export const registerInstitute = createAsyncThunk(
  "auth/registerInstitute",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/register-institute", payload);
      // No tokens are issued here on purpose — the institute is pending approval.
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Registration failed");
    }
  }
);

export const registerStudent = createAsyncThunk(
  "auth/registerStudent",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/auth/register-student", payload);
      persistSession(data);
      return data.user;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Registration failed");
    }
  }
);

export const fetchMe = createAsyncThunk("auth/fetchMe", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/auth/me");
    localStorage.setItem("cbt_user", JSON.stringify(data.user));
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Session expired");
  }
});

export const logoutUser = createAsyncThunk("auth/logoutUser", async (_, { dispatch }) => {
  try {
    await api.post("/auth/logout");
  } catch {
    /* best-effort — clear local session regardless */
  } finally {
    dispatch(logout());
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: storedUser || null,
    isAuthenticated: !!storedUser,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      localStorage.removeItem("cbt_access_token");
      localStorage.removeItem("cbt_refresh_token");
      localStorage.removeItem("cbt_user");
      state.user = null;
      state.isAuthenticated = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const isAuthAction = (action) =>
      action.type.startsWith("auth/") &&
      !action.type.startsWith("auth/logoutUser") &&
      !action.type.startsWith("auth/registerInstitute");
    builder
      .addMatcher(
        (action) => isAuthAction(action) && action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) => isAuthAction(action) && action.type.endsWith("/fulfilled"),
        (state, action) => {
          state.loading = false;
          state.user = action.payload;
          state.isAuthenticated = true;
        }
      )
      .addMatcher(
        (action) => isAuthAction(action) && action.type.endsWith("/rejected"),
        (state, action) => {
          state.loading = false;
          state.error = action.payload;
        }
      );
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
