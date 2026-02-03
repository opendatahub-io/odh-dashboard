import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DiscardChangesModal from '#~/pages/projects/projectPermissions/manageRoles/confirmModal/DiscardChangesModal';
import {
  PendingChangeType,
  type SubjectKindSelection,
} from '#~/pages/projects/projectPermissions/types';

describe('DiscardChangesModal', () => {
  const mockOnDiscard = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    mockOnDiscard.mockClear();
    mockOnCancel.mockClear();
  });

  describe('rendering', () => {
    it('renders modal with title and buttons', () => {
      render(
        <DiscardChangesModal
          changeType={PendingChangeType.Kind}
          subjectKind="user"
          onDiscard={mockOnDiscard}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByTestId('discard-changes-modal')).toBeInTheDocument();
      expect(screen.getByText('Discard changes')).toBeInTheDocument();
      expect(screen.getByTestId('discard-changes-confirm')).toBeInTheDocument();
      expect(screen.getByTestId('discard-changes-cancel')).toBeInTheDocument();
    });
  });

  describe('message variations', () => {
    describe('Kind change type', () => {
      it('shows correct message for switching subject kind', () => {
        render(
          <DiscardChangesModal
            changeType={PendingChangeType.Kind}
            subjectKind="user"
            onDiscard={mockOnDiscard}
            onCancel={mockOnCancel}
          />,
        );

        expect(
          screen.getByText(/Switching the subject kind will discard any changes you've made/),
        ).toBeInTheDocument();
        expect(screen.getByText('Role assignment')).toBeInTheDocument();
      });
    });

    describe('Clear change type', () => {
      it('shows correct message for clearing user selection', () => {
        render(
          <DiscardChangesModal
            changeType={PendingChangeType.Clear}
            subjectKind="user"
            onDiscard={mockOnDiscard}
            onCancel={mockOnCancel}
          />,
        );

        expect(
          screen.getByText(/Clearing the user selection will discard any changes you've made/),
        ).toBeInTheDocument();
      });

      it('shows correct message for clearing group selection', () => {
        render(
          <DiscardChangesModal
            changeType={PendingChangeType.Clear}
            subjectKind="group"
            onDiscard={mockOnDiscard}
            onCancel={mockOnCancel}
          />,
        );

        expect(
          screen.getByText(/Clearing the group selection will discard any changes you've made/),
        ).toBeInTheDocument();
      });
    });

    describe('Switch change type', () => {
      it('shows correct message for switching to different user', () => {
        render(
          <DiscardChangesModal
            changeType={PendingChangeType.Switch}
            subjectKind="user"
            onDiscard={mockOnDiscard}
            onCancel={mockOnCancel}
          />,
        );

        expect(
          screen.getByText(/Switching to a different user will discard any changes you've made/),
        ).toBeInTheDocument();
      });

      it('shows correct message for switching to different group', () => {
        render(
          <DiscardChangesModal
            changeType={PendingChangeType.Switch}
            subjectKind="group"
            onDiscard={mockOnDiscard}
            onCancel={mockOnCancel}
          />,
        );

        expect(
          screen.getByText(/Switching to a different group will discard any changes you've made/),
        ).toBeInTheDocument();
      });
    });
  });

  describe('button interactions', () => {
    it('calls onDiscard when Discard button is clicked', () => {
      render(
        <DiscardChangesModal
          changeType={PendingChangeType.Kind}
          subjectKind="user"
          onDiscard={mockOnDiscard}
          onCancel={mockOnCancel}
        />,
      );

      fireEvent.click(screen.getByTestId('discard-changes-confirm'));
      expect(mockOnDiscard).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Cancel button is clicked', () => {
      render(
        <DiscardChangesModal
          changeType={PendingChangeType.Kind}
          subjectKind="user"
          onDiscard={mockOnDiscard}
          onCancel={mockOnCancel}
        />,
      );

      fireEvent.click(screen.getByTestId('discard-changes-cancel'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when close button is clicked', () => {
      render(
        <DiscardChangesModal
          changeType={PendingChangeType.Kind}
          subjectKind="user"
          onDiscard={mockOnDiscard}
          onCancel={mockOnCancel}
        />,
      );

      fireEvent.click(screen.getByLabelText('Close'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('all changeType and subjectKind combinations', () => {
    const changeTypes: PendingChangeType[] = [
      PendingChangeType.Kind,
      PendingChangeType.Clear,
      PendingChangeType.Switch,
    ];
    const subjectKinds: SubjectKindSelection[] = ['user', 'group'];

    changeTypes.forEach((changeType) => {
      subjectKinds.forEach((subjectKind) => {
        it(`renders correctly for changeType=${changeType} and subjectKind=${subjectKind}`, () => {
          render(
            <DiscardChangesModal
              changeType={changeType}
              subjectKind={subjectKind}
              onDiscard={mockOnDiscard}
              onCancel={mockOnCancel}
            />,
          );

          expect(screen.getByTestId('discard-changes-modal')).toBeInTheDocument();
          expect(screen.getByText('Role assignment')).toBeInTheDocument();
        });
      });
    });
  });
});
