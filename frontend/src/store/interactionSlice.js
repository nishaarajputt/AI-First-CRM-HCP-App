import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";

export const emptyForm = {
  hcp_name: "",
  interaction_type: "Meeting",
  interaction_date: "",
  interaction_time: "",
  attendees: [],
  topics_discussed: "",
  materials_shared: [],
  samples_distributed: [],
  sentiment: "",
  follow_up_actions: "",
  outcome: "",
};

function formForCompliance(form, overrides = {}) {
  return {
    ...form,
    ...overrides,
    interaction_date: (overrides.interaction_date ?? form.interaction_date) || null,
    interaction_time: (overrides.interaction_time ?? form.interaction_time) || null,
    sentiment: (overrides.sentiment ?? form.sentiment) || null,
    topics_discussed: (overrides.topics_discussed ?? form.topics_discussed) || null,
    follow_up_actions: (overrides.follow_up_actions ?? form.follow_up_actions) || null,
    outcome: (overrides.outcome ?? form.outcome) || null,
  };
}

export const saveInteraction = createAsyncThunk(
  "interaction/save",
  async (form, { rejectWithValue }) => {
    try {
      return await api.createInteraction({
        ...form,
        ...formForCompliance(form),
        source: form.source || "form",
      });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const recalculateCompliance = createAsyncThunk(
  "interaction/recalculateCompliance",
  async (_, { getState, rejectWithValue }) => {
    try {
      const form = getState().interaction.form;
      return await api.scoreCompliance(formForCompliance(form));
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const acceptFollowup = createAsyncThunk(
  "interaction/acceptFollowup",
  async (suggestion, { getState, rejectWithValue }) => {
    try {
      const form = getState().interaction.form;
      const existing = form.follow_up_actions || "";
      const follow_up_actions = existing
        ? `${existing}; ${suggestion.action}`
        : suggestion.action;
      const compliance = await api.scoreCompliance(
        formForCompliance(form, { follow_up_actions })
      );
      return { suggestion, follow_up_actions, compliance };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const interactionSlice = createSlice({
  name: "interaction",
  initialState: {
    form: { ...emptyForm },
    saving: false,
    saveError: null,
    lastSavedId: null,
    highlightFields: [],
    completenessScore: 0,
    checklist: [],
    complianceWarnings: [],
    missingFields: [],
    followupSuggestions: [],
    dismissedFollowups: [],
  },
  reducers: {
    setField(state, action) {
      const { field, value } = action.payload;
      state.form[field] = value;
    },
    resetForm(state) {
      state.form = { ...emptyForm };
      state.highlightFields = [];
      state.lastSavedId = null;
      state.saveError = null;
      state.completenessScore = 0;
      state.checklist = [];
      state.complianceWarnings = [];
      state.missingFields = [];
      state.followupSuggestions = [];
      state.dismissedFollowups = [];
    },
    applyExtracted(state, action) {
      const extracted = action.payload || {};
      const changed = [];
      Object.entries(extracted).forEach(([key, value]) => {
        if (!(key in state.form)) return;
        const isEmpty =
          value === null ||
          value === undefined ||
          value === "" ||
          (Array.isArray(value) && value.length === 0);
        if (isEmpty) return;
        state.form[key] = value;
        changed.push(key);
      });
      state.form.source = "chat";
      state.highlightFields = changed;
    },
    setCompliance(state, action) {
      const p = action.payload || {};
      state.completenessScore = p.completeness_score ?? 0;
      state.checklist = p.checklist ?? [];
      state.complianceWarnings = p.compliance_warnings ?? [];
      state.missingFields = p.missing_fields ?? [];
    },
    setFollowupSuggestions(state, action) {
      state.followupSuggestions = action.payload || [];
      state.dismissedFollowups = [];
    },
    dismissFollowup(state, action) {
      state.dismissedFollowups.push(action.payload);
    },
    clearHighlights(state) {
      state.highlightFields = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveInteraction.pending, (state) => {
        state.saving = true;
        state.saveError = null;
      })
      .addCase(saveInteraction.fulfilled, (state, action) => {
        state.saving = false;
        state.lastSavedId = action.payload.id;
      })
      .addCase(saveInteraction.rejected, (state, action) => {
        state.saving = false;
        state.saveError = action.payload || "Failed to save interaction";
      })
      .addCase(acceptFollowup.fulfilled, (state, action) => {
        const { follow_up_actions, suggestion, compliance } = action.payload;
        state.form.follow_up_actions = follow_up_actions;
        state.dismissedFollowups.push(suggestion.action);
        state.highlightFields = ["follow_up_actions"];
        state.completenessScore = compliance.completeness_score;
        state.checklist = compliance.checklist;
        state.complianceWarnings = compliance.compliance_warnings;
        state.missingFields = compliance.missing_fields;
      })
      .addCase(recalculateCompliance.fulfilled, (state, action) => {
        const c = action.payload;
        state.completenessScore = c.completeness_score;
        state.checklist = c.checklist;
        state.complianceWarnings = c.compliance_warnings;
        state.missingFields = c.missing_fields;
      });
  },
});

export const {
  setField,
  resetForm,
  applyExtracted,
  setCompliance,
  setFollowupSuggestions,
  dismissFollowup,
  clearHighlights,
} = interactionSlice.actions;

export default interactionSlice.reducer;
