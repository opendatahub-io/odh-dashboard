import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { MLflowPromptVersion } from '~/app/types';

interface PlaygroundState {
  isPromptManagementModalOpen: boolean;
  activePrompt: MLflowPromptVersion | null;
  modalMode: 'allPrompts' | 'create' | 'edit';
  dirtyPrompt: MLflowPromptVersion | null;
  dirtyPromptSnapshot: MLflowPromptVersion | null;
}

interface PlaygroundActions {
  setIsPromptManagementModalOpen: (isOpen: boolean) => void;
  setActivePrompt: (prompt: MLflowPromptVersion | null) => void;
  setDirtyPrompt: (prompt: MLflowPromptVersion | null) => void;
  resetDirtyPrompt: () => void;
  clearPromptState: (newDirtyPrompt: MLflowPromptVersion | null) => void;
  openModal: (mode: 'allPrompts' | 'create' | 'edit', prompt?: MLflowPromptVersion) => void;
  restoreDirtyPromptSnapshot: () => void;
}

type PlaygroundStore = PlaygroundState & PlaygroundActions;

const initialState: PlaygroundState = {
  isPromptManagementModalOpen: false,
  activePrompt: null,
  modalMode: 'allPrompts',
  dirtyPrompt: null,
  dirtyPromptSnapshot: null,
};

export const usePlaygroundStore = create<PlaygroundStore>()(
  devtools(
    /* eslint-disable no-param-reassign */
    immer((set) => ({
      ...initialState,

      setActivePrompt: (prompt: MLflowPromptVersion | null) => {
        set(
          (state) => {
            state.activePrompt = prompt;
            state.dirtyPrompt = prompt ? { ...prompt } : null;
          },
          false,
          'setActivePrompt',
        );
      },

      setIsPromptManagementModalOpen: (isOpen: boolean) => {
        set(
          (state) => {
            state.isPromptManagementModalOpen = isOpen;
          },
          false,
          'setIsPromptManagementModalOpen',
        );
      },

      openModal: (mode: 'allPrompts' | 'create' | 'edit', prompt?: MLflowPromptVersion) => {
        set((state) => {
          state.dirtyPromptSnapshot = state.dirtyPrompt ? { ...state.dirtyPrompt } : null;
          state.modalMode = mode;
          state.isPromptManagementModalOpen = true;
          if (prompt) {
            state.dirtyPrompt = prompt;
          }
        });
      },

      restoreDirtyPromptSnapshot: () => {
        set(
          (state) => {
            state.dirtyPrompt = state.dirtyPromptSnapshot;
            state.dirtyPromptSnapshot = null;
          },
          false,
          'restoreDirtyPromptSnapshot',
        );
      },

      setDirtyPrompt: (prompt: MLflowPromptVersion | null) => {
        set(
          (state) => {
            state.dirtyPrompt = prompt;
          },
          false,
          'setDirtyPrompt',
        );
      },

      resetDirtyPrompt: () => {
        set(
          (state) => {
            state.dirtyPrompt = state.activePrompt ? { ...state.activePrompt } : null;
          },
          false,
          'resetDirtyPrompt',
        );
      },

      clearPromptState: (newDirtyPrompt: MLflowPromptVersion | null) => {
        set(
          (state) => {
            state.activePrompt = null;
            state.dirtyPrompt = newDirtyPrompt;
          },
          false,
          'clearPromptState',
        );
      },
    })),
    {
      name: 'PlaygroundStore',
    },
  ),
  /* eslint-enable no-param-reassign */
);
