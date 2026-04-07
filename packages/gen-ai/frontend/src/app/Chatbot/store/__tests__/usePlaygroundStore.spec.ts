/* eslint-disable camelcase */
import { act } from '@testing-library/react';
import { MLflowPromptVersion } from '~/app/types';
import { usePlaygroundStore } from '~/app/Chatbot/store/usePlaygroundStore';

describe('usePlaygroundStore', () => {
  const mockPrompt: MLflowPromptVersion = {
    name: 'test-prompt',
    version: 1,
    template: 'You are a helpful assistant.',
    messages: [{ role: 'system', content: 'System message' }],
    tags: { env: 'test' },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    act(() => {
      usePlaygroundStore.setState({
        isPromptManagementModalOpen: false,
        modalMode: 'allPrompts',
        modalConfigId: null,
        dirtyPromptSnapshot: null,
      });
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = usePlaygroundStore.getState();

      expect(state.isPromptManagementModalOpen).toBe(false);
      expect(state.modalMode).toBe('allPrompts');
      expect(state.modalConfigId).toBeNull();
      expect(state.dirtyPromptSnapshot).toBeNull();
    });
  });

  describe('openModal', () => {
    it('should open modal with allPrompts mode', () => {
      act(() => {
        usePlaygroundStore.getState().openModal('allPrompts', 'config-1', null);
      });

      const state = usePlaygroundStore.getState();
      expect(state.isPromptManagementModalOpen).toBe(true);
      expect(state.modalMode).toBe('allPrompts');
      expect(state.modalConfigId).toBe('config-1');
      expect(state.dirtyPromptSnapshot).toBeNull();
    });

    it('should open modal with create mode', () => {
      act(() => {
        usePlaygroundStore.getState().openModal('create', 'config-2', mockPrompt);
      });

      const state = usePlaygroundStore.getState();
      expect(state.isPromptManagementModalOpen).toBe(true);
      expect(state.modalMode).toBe('create');
      expect(state.modalConfigId).toBe('config-2');
    });

    it('should open modal with edit mode', () => {
      act(() => {
        usePlaygroundStore.getState().openModal('edit', 'default', mockPrompt);
      });

      const state = usePlaygroundStore.getState();
      expect(state.isPromptManagementModalOpen).toBe(true);
      expect(state.modalMode).toBe('edit');
      expect(state.modalConfigId).toBe('default');
    });

    it('should create a deep copy of dirtyPromptSnapshot', () => {
      act(() => {
        usePlaygroundStore.getState().openModal('create', 'config-1', mockPrompt);
      });

      const state = usePlaygroundStore.getState();
      expect(state.dirtyPromptSnapshot).not.toBe(mockPrompt);
      expect(state.dirtyPromptSnapshot).toEqual(mockPrompt);
      expect(state.dirtyPromptSnapshot?.messages).not.toBe(mockPrompt.messages);
      expect(state.dirtyPromptSnapshot?.tags).not.toBe(mockPrompt.tags);
    });

    it('should handle null dirtyPromptToSnapshot', () => {
      act(() => {
        usePlaygroundStore.getState().openModal('allPrompts', 'config-1', null);
      });

      const state = usePlaygroundStore.getState();
      expect(state.dirtyPromptSnapshot).toBeNull();
    });

    it('should preserve snapshot when switching modal modes', () => {
      act(() => {
        usePlaygroundStore.getState().openModal('create', 'config-1', mockPrompt);
      });

      const firstSnapshot = usePlaygroundStore.getState().dirtyPromptSnapshot;

      act(() => {
        usePlaygroundStore.getState().openModal('edit', 'config-1', null);
      });

      const secondSnapshot = usePlaygroundStore.getState().dirtyPromptSnapshot;
      expect(secondSnapshot).toBeNull();
      expect(firstSnapshot).not.toBeNull();
    });
  });

  describe('closeModal', () => {
    it('should reset all modal state', () => {
      act(() => {
        usePlaygroundStore.getState().openModal('edit', 'config-1', mockPrompt);
      });

      act(() => {
        usePlaygroundStore.getState().closeModal();
      });

      const state = usePlaygroundStore.getState();
      expect(state.isPromptManagementModalOpen).toBe(false);
      expect(state.modalConfigId).toBeNull();
      expect(state.dirtyPromptSnapshot).toBeNull();
      expect(state.modalMode).toBe('allPrompts');
    });

    it('should reset from any mode', () => {
      const modes: Array<'allPrompts' | 'create' | 'edit'> = ['allPrompts', 'create', 'edit'];

      modes.forEach((mode) => {
        act(() => {
          usePlaygroundStore.getState().openModal(mode, 'config-1', mockPrompt);
        });

        act(() => {
          usePlaygroundStore.getState().closeModal();
        });

        const state = usePlaygroundStore.getState();
        expect(state.isPromptManagementModalOpen).toBe(false);
        expect(state.modalMode).toBe('allPrompts');
      });
    });
  });

  describe('modal workflow', () => {
    it('should support full open-close cycle', () => {
      expect(usePlaygroundStore.getState().isPromptManagementModalOpen).toBe(false);

      act(() => {
        usePlaygroundStore.getState().openModal('create', 'default', mockPrompt);
      });

      expect(usePlaygroundStore.getState().isPromptManagementModalOpen).toBe(true);
      expect(usePlaygroundStore.getState().modalConfigId).toBe('default');
      expect(usePlaygroundStore.getState().dirtyPromptSnapshot).toEqual(mockPrompt);

      act(() => {
        usePlaygroundStore.getState().closeModal();
      });

      expect(usePlaygroundStore.getState().isPromptManagementModalOpen).toBe(false);
      expect(usePlaygroundStore.getState().modalConfigId).toBeNull();
      expect(usePlaygroundStore.getState().dirtyPromptSnapshot).toBeNull();
    });

    it('should support opening modal for different configs sequentially', () => {
      act(() => {
        usePlaygroundStore.getState().openModal('allPrompts', 'config-1', null);
      });
      expect(usePlaygroundStore.getState().modalConfigId).toBe('config-1');

      act(() => {
        usePlaygroundStore.getState().closeModal();
      });

      act(() => {
        usePlaygroundStore.getState().openModal('edit', 'config-2', mockPrompt);
      });
      expect(usePlaygroundStore.getState().modalConfigId).toBe('config-2');
    });
  });
});
