import "./devtools-setup"; // must run first
import { configureStore, createSlice } from "@headlesskit/state-management-toolkit";

const counterSlice = createSlice({
  name: "toolkitCounter",
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

// configureStore's devTools option reads window.__HEADLESSKIT_DEVTOOLS_EXTENSION_COMPOSE__,
// which devtools-setup.ts already populated above — this connects with no extra wiring.
export const toolkitCounterStore = configureStore({
  reducer: { toolkitCounter: counterSlice.reducer },
});

export type ToolkitRootState = ReturnType<typeof toolkitCounterStore.getState>;
