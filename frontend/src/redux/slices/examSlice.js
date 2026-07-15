import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api.js";

export const startExamAttempt = createAsyncThunk(
  "exam/start",
  async ({ examId, cameraConsent = false }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/attempts/start/${examId}`, { cameraConsent });
      return data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Could not start exam");
    }
  }
);

export const submitExamAttempt = createAsyncThunk(
  "exam/submit",
  async ({ attemptId, autoSubmitted = false }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/attempts/${attemptId}/submit`, { autoSubmitted });
      return data.result;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Submit failed");
    }
  }
);

const initialState = {
  attemptId: null,
  exam: null,
  questions: [],
  answers: {}, // keyed by questionId: { selectedOptions, numericAnswer, textAnswer, status }
  currentIndex: 0,
  remainingSeconds: 0,
  violationCount: 0,
  loading: false,
  error: null,
  result: null,
};

const examSlice = createSlice({
  name: "exam",
  initialState,
  reducers: {
    setCurrentIndex: (state, action) => {
      state.currentIndex = action.payload;
    },
    updateLocalAnswer: (state, action) => {
      const { questionId, ...rest } = action.payload;
      state.answers[questionId] = { ...state.answers[questionId], ...rest };
    },
    tickTimer: (state) => {
      if (state.remainingSeconds > 0) state.remainingSeconds -= 1;
    },
    incrementViolation: (state) => {
      state.violationCount += 1;
    },
    resetExamState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(startExamAttempt.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startExamAttempt.fulfilled, (state, action) => {
        state.loading = false;
        state.attemptId = action.payload.attemptId;
        state.exam = action.payload.exam;
        state.questions = action.payload.questions;
        state.remainingSeconds = action.payload.remainingSeconds;
        const answerMap = {};
        action.payload.answers.forEach((a) => {
          answerMap[a.question] = a;
        });
        state.answers = answerMap;
      })
      .addCase(startExamAttempt.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(submitExamAttempt.fulfilled, (state, action) => {
        state.result = action.payload;
      });
  },
});

export const { setCurrentIndex, updateLocalAnswer, tickTimer, incrementViolation, resetExamState } =
  examSlice.actions;
export default examSlice.reducer;
