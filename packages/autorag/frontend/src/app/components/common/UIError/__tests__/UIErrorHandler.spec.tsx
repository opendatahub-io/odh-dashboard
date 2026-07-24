/* eslint-disable camelcase */
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import type { UIError, UIErrorMappings } from '../types';
import { UIErrorInstance } from '../UIErrorInstance';
import { UIErrorHandler, useCatchUIError, useUIErrorHandler } from '../UIErrorHandler';
import { UIErrorDefaults } from '../constants';

const mockUIError: UIError = {
  messageId: 'test_error_one',
  reason: 'Something failed in the backend',
  status: 400,
  transactionId: 'txn-abc-123',
  details: { field: 'name', constraint: 'unique' },
};

const mockUIErrorNoDetails: UIError = {
  messageId: 'test_error_no_details',
  reason: 'A simple failure',
  status: 500,
  transactionId: 'txn-def-456',
  details: {},
};

const testMappings: UIErrorMappings = {
  test_error_one: {
    title: 'Mapped Error Title',
    description: 'Mapped error description for the user',
  },
};

const ShowErrorButton: React.FC<{ error: UIError }> = ({ error }) => {
  const { showUIError } = useUIErrorHandler();
  return (
    <button data-testid="show-error" onClick={() => showUIError(error)}>
      Trigger Error
    </button>
  );
};

const CatchErrorConsumer: React.FC<{
  errorToThrow: unknown;
  fallbackFn: () => void;
}> = ({ errorToThrow, fallbackFn }) => {
  const catchUIError = useCatchUIError();
  return (
    <button data-testid="catch-error" onClick={() => catchUIError(errorToThrow, fallbackFn)}>
      Catch Error
    </button>
  );
};

describe('UIErrorHandler', () => {
  it('should render children', () => {
    render(
      <UIErrorHandler id="test">
        <div data-testid="child">Hello</div>
      </UIErrorHandler>,
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  describe('showUIError', () => {
    it('should display an alert with default title when no mapping matches', () => {
      render(
        <UIErrorHandler id="test">
          <ShowErrorButton error={mockUIErrorNoDetails} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('show-error'));

      const alertGroup = screen.getByTestId('UIErrorAlerts-alert-group');
      expect(
        within(alertGroup).getByText(UIErrorDefaults.uiErrorMapping.title),
      ).toBeInTheDocument();
      expect(within(alertGroup).getByText(mockUIErrorNoDetails.reason)).toBeInTheDocument();
    });

    it('should display an alert with mapped title and description when mapping matches', () => {
      render(
        <UIErrorHandler id="test" uiErrorMappings={testMappings}>
          <ShowErrorButton error={mockUIError} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('show-error'));

      const alertGroup = screen.getByTestId('UIErrorAlerts-alert-group');
      expect(within(alertGroup).getByText('Mapped Error Title')).toBeInTheDocument();
      expect(
        within(alertGroup).getByText('Mapped error description for the user'),
      ).toBeInTheDocument();
    });

    it('should display multiple alerts for multiple errors', () => {
      const MultiErrorTrigger: React.FC = () => {
        const { showUIError } = useUIErrorHandler();
        return (
          <>
            <button data-testid="trigger-1" onClick={() => showUIError(mockUIError)}>
              Error 1
            </button>
            <button data-testid="trigger-2" onClick={() => showUIError(mockUIErrorNoDetails)}>
              Error 2
            </button>
          </>
        );
      };

      render(
        <UIErrorHandler id="test" uiErrorMappings={testMappings}>
          <MultiErrorTrigger />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('trigger-1'));
      fireEvent.click(screen.getByTestId('trigger-2'));

      const alertGroup = screen.getByTestId('UIErrorAlerts-alert-group');
      expect(within(alertGroup).getByText('Mapped Error Title')).toBeInTheDocument();
      expect(
        within(alertGroup).getByText(UIErrorDefaults.uiErrorMapping.title),
      ).toBeInTheDocument();
    });
  });

  describe('closeUIError', () => {
    it('should remove only the closed error while keeping others', () => {
      const CloseConsumer: React.FC = () => {
        const { showUIError, closeUIError } = useUIErrorHandler();
        const [instance, setInstance] = React.useState<UIErrorInstance | null>(null);

        return (
          <>
            <button
              data-testid="add-tracked"
              onClick={() => {
                const inst = new UIErrorInstance(mockUIError);
                setInstance(inst);
                showUIError(inst);
              }}
            >
              Add Tracked
            </button>
            <button data-testid="add-other" onClick={() => showUIError(mockUIErrorNoDetails)}>
              Add Other
            </button>
            <button
              data-testid="close-tracked"
              onClick={() => {
                if (instance) {
                  closeUIError(instance);
                }
              }}
            >
              Close Tracked
            </button>
          </>
        );
      };

      render(
        <UIErrorHandler id="test" uiErrorMappings={testMappings}>
          <CloseConsumer />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('add-tracked'));
      fireEvent.click(screen.getByTestId('add-other'));

      const alertGroup = screen.getByTestId('UIErrorAlerts-alert-group');
      expect(within(alertGroup).getByText('Mapped Error Title')).toBeInTheDocument();
      expect(within(alertGroup).getByText(mockUIErrorNoDetails.reason)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('close-tracked'));
      // The tracked error's mapped title should no longer render as an active alert
      expect(within(alertGroup).queryByText('Mapped Error Title')).not.toBeInTheDocument();
      // The other error should still be present
      expect(within(alertGroup).getByText(mockUIErrorNoDetails.reason)).toBeInTheDocument();
    });
  });

  describe('showDetails (modal)', () => {
    it('should open the modal with error details when "More details..." is clicked', () => {
      render(
        <UIErrorHandler id="test" uiErrorMappings={testMappings}>
          <ShowErrorButton error={mockUIError} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('show-error'));
      fireEvent.click(screen.getByText('More details...'));

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText(mockUIError.transactionId)).toBeInTheDocument();
      expect(within(modal).getByText(mockUIError.messageId)).toBeInTheDocument();
      expect(within(modal).getByText('Mapped Error Title')).toBeInTheDocument();
    });

    it('should display serialized details in the modal code block', () => {
      render(
        <UIErrorHandler id="test">
          <ShowErrorButton error={mockUIError} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('show-error'));
      fireEvent.click(screen.getByText('More details...'));

      expect(screen.getByText(/"field": "name"/)).toBeInTheDocument();
      expect(screen.getByText(/"constraint": "unique"/)).toBeInTheDocument();
    });

    it('should not display details section when details is empty', () => {
      render(
        <UIErrorHandler id="test">
          <ShowErrorButton error={mockUIErrorNoDetails} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('show-error'));
      fireEvent.click(screen.getByText('More details...'));

      expect(screen.queryByText(UIErrorDefaults.labels.subtitleDetails)).not.toBeInTheDocument();
    });

    it('should close the modal when cancel button is clicked', () => {
      render(
        <UIErrorHandler id="test">
          <ShowErrorButton error={mockUIError} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('show-error'));
      fireEvent.click(screen.getByText('More details...'));
      expect(screen.getByText(mockUIError.transactionId)).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('UIErrorModal-cancel'));
      expect(screen.queryByText(mockUIError.transactionId)).not.toBeInTheDocument();
    });

    it('should show default title in modal when no mapping matches', () => {
      render(
        <UIErrorHandler id="test">
          <ShowErrorButton error={mockUIErrorNoDetails} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('show-error'));
      fireEvent.click(screen.getByText('More details...'));

      const modal = screen.getByRole('dialog');
      expect(within(modal).getByText(UIErrorDefaults.uiErrorMapping.title)).toBeInTheDocument();
    });
  });

  describe('useCatchUIError', () => {
    it('should show a UI error alert when the error is a UIError', () => {
      const fallback = jest.fn();
      const instance = new UIErrorInstance(mockUIError);

      render(
        <UIErrorHandler id="test" uiErrorMappings={testMappings}>
          <CatchErrorConsumer errorToThrow={instance} fallbackFn={fallback} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('catch-error'));

      const alertGroup = screen.getByTestId('UIErrorAlerts-alert-group');
      expect(within(alertGroup).getByText('Mapped Error Title')).toBeInTheDocument();
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should show a UI error alert when the error is a plain UIError object', () => {
      const fallback = jest.fn();

      render(
        <UIErrorHandler id="test" uiErrorMappings={testMappings}>
          <CatchErrorConsumer errorToThrow={mockUIError} fallbackFn={fallback} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('catch-error'));

      const alertGroup = screen.getByTestId('UIErrorAlerts-alert-group');
      expect(within(alertGroup).getByText('Mapped Error Title')).toBeInTheDocument();
      expect(fallback).not.toHaveBeenCalled();
    });

    it('should call the fallback when the error is not a UIError', () => {
      const fallback = jest.fn();
      const regularError = new Error('not a UIError');

      render(
        <UIErrorHandler id="test">
          <CatchErrorConsumer errorToThrow={regularError} fallbackFn={fallback} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('catch-error'));

      expect(fallback).toHaveBeenCalledTimes(1);
      const alertGroup = screen.getByTestId('UIErrorAlerts-alert-group');
      expect(alertGroup.children).toHaveLength(0);
    });

    it('should call the fallback for null errors', () => {
      const fallback = jest.fn();

      render(
        <UIErrorHandler id="test">
          <CatchErrorConsumer errorToThrow={null} fallbackFn={fallback} />
        </UIErrorHandler>,
      );

      fireEvent.click(screen.getByTestId('catch-error'));
      expect(fallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('useUIErrorHandler', () => {
    it('should throw when used outside of UIErrorHandler', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const BadConsumer: React.FC = () => {
        useUIErrorHandler();
        return null;
      };

      expect(() => render(<BadConsumer />)).toThrow(
        'useUIErrorHandler must be used within a UIErrorHandlerProvider',
      );
      spy.mockRestore();
    });
  });
});
