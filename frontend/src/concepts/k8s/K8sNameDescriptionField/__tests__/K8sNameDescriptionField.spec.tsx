import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import K8sNameDescriptionField, {
  useK8sNameDescriptionFieldData,
  NameAvailabilityStatus,
} from '#~/concepts/k8s/K8sNameDescriptionField/K8sNameDescriptionField';

// Wrapper component to test with the hook
const TestWrapper: React.FC<{
  nameChecker?: (resourceName: string) => Promise<boolean> | boolean | null;
  onNameValidationChange?: (status: NameAvailabilityStatus) => void;
}> = ({ nameChecker, onNameValidationChange }) => {
  const k8sNameDescriptionData = useK8sNameDescriptionFieldData();

  return (
    <K8sNameDescriptionField
      dataTestId="test"
      nameChecker={nameChecker}
      onNameValidationChange={onNameValidationChange}
      {...k8sNameDescriptionData}
    />
  );
};

describe('K8sNameDescriptionField', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render name and description fields', () => {
    render(<TestWrapper />);

    expect(screen.getByTestId('test-name')).toBeInTheDocument();
    expect(screen.getByTestId('test-description')).toBeInTheDocument();
  });

  it('should not show name validation feedback when no nameChecker is provided', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<TestWrapper />);

    await user.type(screen.getByTestId('test-name'), 'test-project');
    act(() => {
      jest.runAllTimers();
    });

    expect(screen.queryByText('Resource name available')).not.toBeInTheDocument();
    expect(screen.queryByText('Checking resource name availability...')).not.toBeInTheDocument();
  });

  describe('with nameChecker', () => {
    it('should debounce the nameChecker call', async () => {
      const nameCheckerMock = jest.fn().mockResolvedValue(true);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<TestWrapper nameChecker={nameCheckerMock} />);

      // Type multiple characters quickly
      await user.type(screen.getByTestId('test-name'), 'abc');

      // Before debounce timeout, nameChecker should not be called
      expect(nameCheckerMock).not.toHaveBeenCalled();

      // Advance timers past the debounce delay (500ms)
      act(() => {
        jest.advanceTimersByTime(600);
      });

      // Now nameChecker should be called once with the generated k8s name
      await waitFor(() => {
        expect(nameCheckerMock).toHaveBeenCalledTimes(1);
      });
    });

    it('should show "in progress" state while checking', async () => {
      let resolveChecker: ((value: boolean) => void) | undefined;
      const nameCheckerMock = jest.fn().mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            resolveChecker = resolve;
          }),
      );
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<TestWrapper nameChecker={nameCheckerMock} />);

      await user.type(screen.getByTestId('test-name'), 'test');

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByText('Checking resource name availability...')).toBeInTheDocument();
      });

      // Resolve the promise
      await act(async () => {
        resolveChecker?.(true);
      });

      await waitFor(() => {
        expect(
          screen.queryByText('Checking resource name availability...'),
        ).not.toBeInTheDocument();
      });
    });

    it('should show success state when name is available', async () => {
      const nameCheckerMock = jest.fn().mockResolvedValue(true);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<TestWrapper nameChecker={nameCheckerMock} />);

      await user.type(screen.getByTestId('test-name'), 'available-name');

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByText('Resource name available')).toBeInTheDocument();
      });
    });

    it('should show error state when name is taken', async () => {
      const nameCheckerMock = jest.fn().mockResolvedValue(false);
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<TestWrapper nameChecker={nameCheckerMock} />);

      await user.type(screen.getByTestId('test-name'), 'taken-name');

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/A project with this resource name already exists/),
        ).toBeInTheDocument();
      });
    });

    it('should call onNameValidationChange callback with correct status', async () => {
      const nameCheckerMock = jest.fn().mockResolvedValue(true);
      const onNameValidationChangeMock = jest.fn();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <TestWrapper
          nameChecker={nameCheckerMock}
          onNameValidationChange={onNameValidationChangeMock}
        />,
      );

      await user.type(screen.getByTestId('test-name'), 'test');

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(onNameValidationChangeMock).toHaveBeenCalledWith(NameAvailabilityStatus.IN_PROGRESS);
      });

      await waitFor(() => {
        expect(onNameValidationChangeMock).toHaveBeenCalledWith(NameAvailabilityStatus.VALID);
      });
    });

    it('should disable input while checking name availability', async () => {
      let resolveChecker: ((value: boolean) => void) | undefined;
      const nameCheckerMock = jest.fn().mockImplementation(
        () =>
          new Promise<boolean>((resolve) => {
            resolveChecker = resolve;
          }),
      );
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(<TestWrapper nameChecker={nameCheckerMock} />);

      await user.type(screen.getByTestId('test-name'), 'test');

      act(() => {
        jest.advanceTimersByTime(600);
      });

      await waitFor(() => {
        expect(screen.getByTestId('test-name')).toBeDisabled();
      });

      // Resolve the promise
      await act(async () => {
        resolveChecker?.(true);
      });

      await waitFor(() => {
        expect(screen.getByTestId('test-name')).not.toBeDisabled();
      });
    });

    describe('with ResourceNameField visible', () => {
      it('should show error validation on ResourceNameField when name is taken', async () => {
        const nameCheckerMock = jest.fn().mockResolvedValue(false);
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

        render(<TestWrapper nameChecker={nameCheckerMock} />);

        // Type a name first
        await user.type(screen.getByTestId('test-name'), 'taken-name');

        // Click "Edit resource name" to show ResourceNameField
        await user.click(screen.getByTestId('test-editResourceLink'));

        // ResourceNameField should now be visible
        expect(screen.getByTestId('test-resourceName')).toBeInTheDocument();

        // Trigger the name check
        act(() => {
          jest.advanceTimersByTime(600);
        });

        // Wait for the error state
        await waitFor(() => {
          expect(
            screen.getByText(/A project with this resource name already exists/),
          ).toBeInTheDocument();
          expect(screen.getByTestId('resource-name-unique')).toBeInTheDocument();
        });

        // The ResourceNameField input should have error validation styling
        // (validated="error" adds aria-invalid="true")
        await waitFor(() => {
          expect(screen.getByTestId('test-resourceName')).toHaveAttribute('aria-invalid', 'true');
        });
      });

      it('should disable ResourceNameField while checking name availability', async () => {
        let resolveChecker: ((value: boolean) => void) | undefined;
        const nameCheckerMock = jest.fn().mockImplementation(
          () =>
            new Promise<boolean>((resolve) => {
              resolveChecker = resolve;
            }),
        );
        const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

        render(<TestWrapper nameChecker={nameCheckerMock} />);

        // Type a name first
        await user.type(screen.getByTestId('test-name'), 'test-name');

        // Click "Edit resource name" to show ResourceNameField
        await user.click(screen.getByTestId('test-editResourceLink'));

        // ResourceNameField should now be visible
        expect(screen.getByTestId('test-resourceName')).toBeInTheDocument();

        // Trigger the name check
        act(() => {
          jest.advanceTimersByTime(600);
        });

        // Both inputs should be disabled while checking
        await waitFor(() => {
          expect(screen.getByTestId('test-name')).toBeDisabled();
          expect(screen.getByTestId('test-resourceName')).toBeDisabled();
        });

        // Resolve the promise
        await act(async () => {
          resolveChecker?.(true);
        });

        // Both inputs should be enabled after check completes
        await waitFor(() => {
          expect(screen.getByTestId('test-name')).not.toBeDisabled();
          expect(screen.getByTestId('test-resourceName')).not.toBeDisabled();
        });
      });
    });
  });
});

describe('NameAvailabilityStatus enum', () => {
  it('should have correct values', () => {
    expect(NameAvailabilityStatus.UNCHECKED).toBe('');
    expect(NameAvailabilityStatus.VALID).toBe('valid');
    expect(NameAvailabilityStatus.INVALID).toBe('invalid');
    expect(NameAvailabilityStatus.IN_PROGRESS).toBe('in progress');
  });
});
