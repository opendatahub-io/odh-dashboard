import { renderHook, act } from '@testing-library/react';
import useDiscardChangesConfirmation from '#~/pages/projects/projectPermissions/manageRoles/useDiscardChangesConfirmation';
import {
  PendingChangeType,
  type SubjectKindSelection,
} from '#~/pages/projects/projectPermissions/types';

describe('useDiscardChangesConfirmation', () => {
  const mockSetSubjectKind = jest.fn();
  const mockSetSubjectName = jest.fn();

  const existingSubjectNames = ['existing-user-1', 'existing-user-2'];

  const renderWithArgs = (
    hasChanges: boolean,
    currentSubjectName: string,
    currentSubjectKind: SubjectKindSelection = 'user',
  ) =>
    renderHook(() =>
      useDiscardChangesConfirmation(
        hasChanges,
        currentSubjectName,
        currentSubjectKind,
        existingSubjectNames,
        mockSetSubjectKind,
        mockSetSubjectName,
      ),
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when there are no unsaved changes', () => {
    it('should apply subject kind change immediately without confirmation', () => {
      const { result } = renderWithArgs(false, '');

      act(() => {
        result.current.handleSubjectKindChange('group');
      });

      expect(result.current.pendingChange).toBeNull();
      expect(mockSetSubjectKind).toHaveBeenCalledWith('group');
      expect(mockSetSubjectName).toHaveBeenCalledWith('');
    });

    it('should apply subject name change immediately without confirmation', () => {
      const { result } = renderWithArgs(false, 'existing-user-1');

      act(() => {
        result.current.handleSubjectNameChange('new-user');
      });

      expect(result.current.pendingChange).toBeNull();
      expect(mockSetSubjectName).toHaveBeenCalledWith('new-user');
    });
  });

  describe('when there are unsaved changes', () => {
    describe('switching subject kind', () => {
      it('should show confirmation modal for kind change', () => {
        const { result } = renderWithArgs(true, 'existing-user-1');

        act(() => {
          result.current.handleSubjectKindChange('group');
        });

        expect(result.current.pendingChange).toEqual({
          type: PendingChangeType.Kind,
          newKind: 'group',
        });
        expect(mockSetSubjectKind).not.toHaveBeenCalled();
      });

      it('should apply kind change on confirm', () => {
        const { result } = renderWithArgs(true, 'existing-user-1');

        act(() => {
          result.current.handleSubjectKindChange('group');
        });
        act(() => {
          result.current.closeModal(true);
        });

        expect(result.current.pendingChange).toBeNull();
        expect(mockSetSubjectKind).toHaveBeenCalledWith('group');
        expect(mockSetSubjectName).toHaveBeenCalledWith('');
      });

      it('should cancel kind change on cancel', () => {
        const { result } = renderWithArgs(true, 'existing-user-1');

        act(() => {
          result.current.handleSubjectKindChange('group');
        });
        act(() => {
          result.current.closeModal(false);
        });

        expect(result.current.pendingChange).toBeNull();
        expect(mockSetSubjectKind).not.toHaveBeenCalled();
      });
    });

    describe('clearing selection', () => {
      it('should show confirmation modal for clearing (empty string)', () => {
        const { result } = renderWithArgs(true, 'existing-user-1');

        act(() => {
          result.current.handleSubjectNameChange('');
        });

        expect(result.current.pendingChange).toEqual({ type: PendingChangeType.Clear });
      });
    });

    describe('switching subjects', () => {
      it('should show confirmation for Existing → Existing', () => {
        const { result } = renderWithArgs(true, 'existing-user-1');

        act(() => {
          result.current.handleSubjectNameChange('existing-user-2');
        });

        expect(result.current.pendingChange).toEqual({
          type: PendingChangeType.Switch,
          newName: 'existing-user-2',
        });
      });

      it('should show confirmation for Existing → New', () => {
        const { result } = renderWithArgs(true, 'existing-user-1');

        act(() => {
          result.current.handleSubjectNameChange('brand-new-user');
        });

        expect(result.current.pendingChange).toEqual({
          type: PendingChangeType.Switch,
          newName: 'brand-new-user',
        });
      });

      it('should show confirmation for New → Existing', () => {
        const { result } = renderWithArgs(true, 'new-user');

        act(() => {
          result.current.handleSubjectNameChange('existing-user-1');
        });

        expect(result.current.pendingChange).toEqual({
          type: PendingChangeType.Switch,
          newName: 'existing-user-1',
        });
      });

      it('should NOT show confirmation for New → New (special case)', () => {
        const { result } = renderWithArgs(true, 'new-user-1');

        act(() => {
          result.current.handleSubjectNameChange('new-user-2');
        });

        expect(result.current.pendingChange).toBeNull();
        expect(mockSetSubjectName).toHaveBeenCalledWith('new-user-2');
      });
    });
  });

  describe('edge cases', () => {
    it('should ignore kind change to same kind', () => {
      const { result } = renderWithArgs(true, 'existing-user-1', 'user');

      act(() => {
        result.current.handleSubjectKindChange('user');
      });

      expect(result.current.pendingChange).toBeNull();
      expect(mockSetSubjectKind).not.toHaveBeenCalled();
    });

    it('should ignore name change to same name', () => {
      const { result } = renderWithArgs(true, 'existing-user-1');

      act(() => {
        result.current.handleSubjectNameChange('existing-user-1');
      });

      expect(result.current.pendingChange).toBeNull();
      expect(mockSetSubjectName).not.toHaveBeenCalled();
    });

    it('should allow name change when current subject is empty', () => {
      const { result } = renderWithArgs(true, '');

      act(() => {
        result.current.handleSubjectNameChange('new-user');
      });

      expect(result.current.pendingChange).toBeNull();
      expect(mockSetSubjectName).toHaveBeenCalledWith('new-user');
    });
  });
});
