import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import GlobalProjectWarningModal from '#~/pages/clusterSettings/GlobalProjectWarningModal';

describe('GlobalProjectWarningModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('clear variant', () => {
    it('should render clear-specific title and body', () => {
      render(
        <GlobalProjectWarningModal variant="clear" onConfirm={jest.fn()} onCancel={jest.fn()} />,
      );
      expect(screen.getByText('Clear the global project?')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Clearing the global project selection will make shared prompt templates unavailable to users in this cluster. You can assign a global project again at any time.',
        ),
      ).toBeInTheDocument();
    });

    it('should render "Clear global project" confirm button', () => {
      render(
        <GlobalProjectWarningModal variant="clear" onConfirm={jest.fn()} onCancel={jest.fn()} />,
      );
      expect(screen.getByTestId('global-project-warning-confirm')).toHaveTextContent(
        'Clear global project',
      );
    });
  });

  describe('switch variant', () => {
    it('should render switch-specific title and body', () => {
      render(
        <GlobalProjectWarningModal variant="switch" onConfirm={jest.fn()} onCancel={jest.fn()} />,
      );
      expect(screen.getByText('Change the global project?')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Assigning a different project as the global project will change the prompt templates available to all users in this cluster.',
        ),
      ).toBeInTheDocument();
    });

    it('should render "Change global project" confirm button', () => {
      render(
        <GlobalProjectWarningModal variant="switch" onConfirm={jest.fn()} onCancel={jest.fn()} />,
      );
      expect(screen.getByTestId('global-project-warning-confirm')).toHaveTextContent(
        'Change global project',
      );
    });
  });

  describe('interactions', () => {
    it('should call onConfirm when confirm button is clicked', () => {
      const onConfirm = jest.fn();
      render(
        <GlobalProjectWarningModal variant="clear" onConfirm={onConfirm} onCancel={jest.fn()} />,
      );
      fireEvent.click(screen.getByTestId('global-project-warning-confirm'));
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when cancel button is clicked', () => {
      const onCancel = jest.fn();
      render(
        <GlobalProjectWarningModal variant="switch" onConfirm={jest.fn()} onCancel={onCancel} />,
      );
      fireEvent.click(screen.getByTestId('global-project-warning-cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('should call onCancel when the modal close button is clicked', () => {
      const onCancel = jest.fn();
      render(
        <GlobalProjectWarningModal variant="clear" onConfirm={jest.fn()} onCancel={onCancel} />,
      );
      fireEvent.click(screen.getByLabelText('Close'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
