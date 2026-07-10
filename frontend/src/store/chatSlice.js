import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";
import {
  applyExtracted,
  setCompliance,
  setFollowupSuggestions,
} from "./interactionSlice";

const WELCOME = {
  role: "assistant",
  variant: "assistant",
  content:
    'Log interaction details here (e.g., "Met Dr. Smith, discussed Prodo-X efficacy, positive sentiment, shared brochure") or ask for help. You can also refine: "change sentiment to neutral".',
};

export const sendMessage = createAsyncThunk(
  "chat/send",
  async (message, { getState, dispatch, rejectWithValue }) => {
    const state = getState();
    const history = state.chat.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
    try {
      const res = await api.sendChat({
        message,
        history,
        current_form: state.interaction.form,
      });
      if (res.extracted) {
        dispatch(applyExtracted(res.extracted));
      }
      dispatch(
        setCompliance({
          completeness_score: res.completeness_score,
          checklist: res.checklist,
          compliance_warnings: res.compliance_warnings,
          missing_fields: res.missing_fields,
        })
      );
      dispatch(setFollowupSuggestions(res.followup_suggestions || []));
      return res;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const chatSlice = createSlice({
  name: "chat",
  initialState: {
    messages: [WELCOME],
    sending: false,
    error: null,
    readyToSave: false,
    lastUpdatedFields: [],
    lastIntent: null,
  },
  reducers: {
    pushUserMessage(state, action) {
      state.messages.push({ role: "user", content: action.payload });
    },
    clearChat(state) {
      state.messages = [WELCOME];
      state.readyToSave = false;
      state.error = null;
      state.lastUpdatedFields = [];
      state.lastIntent = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(sendMessage.pending, (state) => {
        state.sending = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.sending = false;
        const {
          intent,
          ready_to_save,
          reply,
          updated_fields,
          completeness_score,
          followup_suggestions,
        } = action.payload;
        const isLog = intent === "log_interaction" && ready_to_save;
        const isRefine = intent === "refine_interaction" && updated_fields?.length;

        let variant = "assistant";
        let content = reply;

        if (isRefine) {
          variant = "refine";
          content = reply;
        } else if (isLog) {
          variant = "success";
          content = `✅ **Interaction logged successfully!** ${reply}`;
        }

        state.messages.push({
          role: "assistant",
          variant,
          content,
          intent,
          updated_fields: updated_fields || [],
          completeness_score,
          followup_count: followup_suggestions?.length || 0,
        });
        state.readyToSave = ready_to_save;
        state.lastUpdatedFields = updated_fields || [];
        state.lastIntent = intent;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sending = false;
        state.error = action.payload || "Something went wrong";
        state.messages.push({
          role: "assistant",
          content: `⚠️ ${action.payload || "Something went wrong"}`,
          error: true,
        });
      });
  },
});

export const { pushUserMessage, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
