import { create } from "zustand";

// Drafts stay in memory, scoped to the account and conversation. Never persist private messages to localStorage.
export const useMessageDraftStore = create(set => ({
  drafts: {},
  setDraft: (key, draft) => set(state => ({ drafts: { ...state.drafts, [key]: draft } })),
  clearDraft: (key, clientId) => set(state => {
    if (state.drafts[key]?.clientId !== clientId) return state;
    const drafts = { ...state.drafts };
    delete drafts[key];
    return { drafts };
  }),
}));
