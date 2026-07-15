import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice.js";
import examReducer from "./slices/examSlice.js";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    exam: examReducer,
  },
});
