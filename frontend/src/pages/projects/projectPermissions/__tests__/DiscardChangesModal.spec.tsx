import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DiscardChangesModal from '#~/pages/projects/projectPermissions/manageRoles/confirmModal/DiscardChangesModal';
import { PendingChangeType } from '#~/pages/projects/projectPermissions/types';

describe('DiscardChangesModal', () => {
  const mockOnDiscard = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal with title and buttons', () => {
      render(
        <DiscardChangesModal
          changeType={PendingChangeType.Kind}
          onDiscard={mockOnDiscard}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByTestId('discard-changes-modal')).toBeInTheDocument();
      expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
      expect(screen.getByTestId('discard-changes-confirm')).toBeInTheDocument();
      expect(screen.getByTestId('discard-changes-cancel')).toBeInTheDocument();
    });
  });

  describe('message variations', () => {
    describe('Kind change type', () => {
      it('should show correct message for switching subject kind', () => {
        render(
          <DiscardChangesModal
            changeType={PendingChangeType.Kind}
            onDiscard={mockOnDiscard}
            onCancel={mockOnCancel}
          />,
        );

        expect(
          screen.getByText(/Editing the subject kind will discard your changes/),
        ).toBeInTheDocument();
      });
    });

    describe('Clear change type', () => {
      it('should show correct message for clearing selection', () => {
        render(
          <DiscardChangesModal
            changeType={PendingChangeType.Clear}
            onDiscard={mockOnDiscard}
            onCancel={mockOnCancel}
          />,
        );

        expect(
          screen.getByText(/Editing the subject name will discard your changes/),
        ).toBeInTheDocument();
      });
    });

    describe('Switch change type', () => {
      it('should show correct message for switching to different subject', () => {
        render(
          <DiscardChangesModal
            changeType={PendingChangeType.Switch}
            onDiscard={mockOnDiscard}
            onCancel={mockOnCancel}
          />,
        );

        expect(
          screen.getByText(/Editing the subject name will discard your changes/),
        ).toBeInTheDocument();
      });
    });
  });

  describe('button interactions', () => {
    it('should call onDiscard when Discard button is clicked', () => {
      render(
        <DiscardChangesModal
          changeType={PendingChangeType.Kind}
          onDiscard={mockOnDiscard}
          onCancel={mockOnCancel}
        />,
      );

      fireEvent.click(screen.getByTestId('discard-changes-confirm'));
      expect(mockOnDiscard).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when Cancel button is clicked', () => {
      render(
        <DiscardChangesModal
          changeType={PendingChangeType.Kind}
          onDiscard={mockOnDiscard}
          onCancel={mockOnCancel}
        />,
      );

      fireEvent.click(screen.getByTestId('discard-changes-cancel'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when close button is clicked', () => {
      render(
        <DiscardChangesModal
          changeType={PendingChangeType.Kind}
          onDiscard={mockOnDiscard}
          onCancel={mockOnCancel}
        />,
      );

      fireEvent.click(screen.getByLabelText('Close'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('all changeType combinations', () => {
    const changeTypes: PendingChangeType[] = [
      PendingChangeType.Kind,
      PendingChangeType.Clear,
      PendingChangeType.Switch,
    ];

    changeTypes.forEach((changeType) => {
      it(`should render correctly for changeType=${changeType}`, () => {
        render(
          <DiscardChangesModal
            changeType={changeType}
            onDiscard={mockOnDiscard}
            onCancel={mockOnCancel}
          />,
        );

        expect(screen.getByTestId('discard-changes-modal')).toBeInTheDocument();
      });
    });
  });
});
