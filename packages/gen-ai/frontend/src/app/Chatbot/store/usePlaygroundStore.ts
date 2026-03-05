import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { MLflowPromptVersion } from '~/app/types';

interface PlaygroundState {
  isPromptManagementModalOpen: boolean;
  activePrompt: MLflowPromptVersion | null;
}

interface PlaygroundActions {
  setIsPromptManagementModalOpen: (isOpen: boolean) => void;
  setActivePrompt: (prompt: MLflowPromptVersion) => void;
}

type PlaygroundStore = PlaygroundState & PlaygroundActions;

const initialState: PlaygroundState = {
  isPromptManagementModalOpen: false,
  activePrompt: null,
};

export const usePlaygroundStore = create<PlaygroundStore>()(
  devtools(
    /* eslint-disable no-param-reassign */
    immer((set) => ({
      ...initialState,

      setActivePrompt: (prompt: MLflowPromptVersion) => {
        set(
          (state) => {
            state.activePrompt = prompt;
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
    })),
    {
      name: 'PlaygroundStore',
    },
  ),
  /* eslint-enable no-param-reassign */
);
