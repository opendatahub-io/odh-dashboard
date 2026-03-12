import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

interface PlaygroundState {
  isPromptManagementModalOpen: boolean;
}

interface PlaygroundActions {
  setIsPromptManagementModalOpen: (isOpen: boolean) => void;
}

type PlaygroundStore = PlaygroundState & PlaygroundActions;

const initialState: PlaygroundState = {
  isPromptManagementModalOpen: false,
};

export const usePlaygroundStore = create<PlaygroundStore>()(
  devtools(
    /* eslint-disable no-param-reassign */
    immer((set) => ({
      ...initialState,

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
