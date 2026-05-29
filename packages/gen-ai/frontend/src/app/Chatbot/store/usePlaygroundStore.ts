import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { MLflowPromptVersion } from '~/app/types';
import { deepCopyPrompt } from './utils';

interface PlaygroundState {
  isPromptManagementModalOpen: boolean;
  modalMode: 'allPrompts' | 'create' | 'edit';
  modalConfigId: string | null;
  dirtyPromptSnapshot: MLflowPromptVersion | null;
}

interface PlaygroundActions {
  openModal: (
    mode: 'allPrompts' | 'create' | 'edit',
    configId: string,
    dirtyPromptToSnapshot: MLflowPromptVersion | null,
  ) => void;
  closeModal: () => void;
}

type PlaygroundStore = PlaygroundState & PlaygroundActions;

const initialState: PlaygroundState = {
  isPromptManagementModalOpen: false,
  modalMode: 'allPrompts',
  modalConfigId: null,
  dirtyPromptSnapshot: null,
};

export const usePlaygroundStore = create<PlaygroundStore>()(
  devtools(
    immer((set) => ({
      /* eslint-disable no-param-reassign */
      ...initialState,

      openModal: (
        mode: 'allPrompts' | 'create' | 'edit',
        configId: string,
        dirtyPromptToSnapshot: MLflowPromptVersion | null,
      ) => {
        set(
          (state) => {
            state.dirtyPromptSnapshot = deepCopyPrompt(dirtyPromptToSnapshot);
            state.modalMode = mode;
            state.modalConfigId = configId;
            state.isPromptManagementModalOpen = true;
          },
          false,
          'openModal',
        );
      },

      closeModal: () => {
        set(
          (state) => {
            state.isPromptManagementModalOpen = false;
            state.modalConfigId = null;
            state.dirtyPromptSnapshot = null;
            state.modalMode = 'allPrompts';
          },
          false,
          'closeModal',
        );
      },
      /* eslint-enable no-param-reassign */
    })),
    {
      name: 'PlaygroundStore',
    },
  ),
);
