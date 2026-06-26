import { configureStore, createSlice } from "@headlesskit/state-management-toolkit";

const counterSlice = createSlice({
  name: "counter",
  initialState: { value: 0 },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
  },
});

export const { increment, decrement } = counterSlice.actions;

export const counterStore = configureStore({
  reducer: { counter: counterSlice.reducer },
});

export type RootState = ReturnType<typeof counterStore.getState>;
