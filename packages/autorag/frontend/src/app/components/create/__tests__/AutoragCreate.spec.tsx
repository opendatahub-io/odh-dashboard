import { zodResolver } from '@hookform/resolvers/zod';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import AutoragCreate from '~/app/components/create/AutoragCreate';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

// Mock React Router hooks
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(() => ({ namespace: 'test-namespace' })),
}));

// Mock SecretSelector component to avoid fetch errors
jest.mock('~/app/components/common/SecretSelector', () => {
  const { useEffect } = jest.requireActual<typeof import('react')>('react');
  const MockSecretSelector = ({
    onChange,
    value,
    dataTestId,
    onRefreshReady,
  }: {
    onChange: (
      secret:
        | {
            uuid: string;
            name: string;
            data: Record<string, string>;
            type?: string;
            invalid?: boolean;
          }
        | undefined,
    ) => void;
    value?: string;
    dataTestId?: string;
    onRefreshReady?: (
      refresh: () => Promise<
        { uuid: string; name: string; data: Record<string, string>; type?: string }[] | undefined
      >,
    ) => void;
  }) => {
    useEffect(() => {
      if (onRefreshReady) {
        onRefreshReady(() =>
          Promise.resolve([
            {
              uuid: 'new-secret-uuid',
              name: 'new-lls-secret',
              data: {},
              type: 'lls',
            },
          ]),
        );
      }
    }, [onRefreshReady]);

    return (
      <div data-testid={dataTestId}>
        <button
          data-testid={`${dataTestId}-select-secret`}
          onClick={() =>
            onChange({
              uuid: 'secret-1',
              name: 'Test LLS Secret',
              data: {},
              type: 'lls',
              invalid: false,
            })
          }
        >
          Select Secret
        </button>
        {value && <div data-testid={`${dataTestId}-value`}>{value}</div>}
      </div>
    );
  };
  return {
    __esModule: true,
    default: MockSecretSelector,
  };
});

// Mock LlamaStackConnectionModal
jest.mock('~/app/components/common/LlamaStackConnectionModal', () => ({
  __esModule: true,
  default: ({
    onClose,
    onSubmit,
  }: {
    namespace: string;
    onClose: () => void;
    onSubmit: (secretName: string) => void;
  }) => (
    <div data-testid="lls-connection-modal">
      <button
        data-testid="lls-modal-submit"
        onClick={() => {
          onSubmit('new-lls-secret');
          onClose();
        }}
      >
        Add connection
      </button>
      <button data-testid="lls-modal-cancel" onClick={onClose}>
        Cancel
      </button>
    </div>
  ),
}));

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: configureSchema.defaults,
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const renderComponent = () =>
  render(
    <FormWrapper>
      <AutoragCreate />
    </FormWrapper>,
  );

describe('AutoragCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the Name input field', () => {
      renderComponent();
      expect(screen.getByLabelText(/Name/i)).toBeInTheDocument();
    });

    it('should render the Description textarea field', () => {
      renderComponent();
      expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    });

    it('should mark Name field as required', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Name/i);
      expect(nameInput).toBeRequired();
    });

    it('should not mark Description field as required', () => {
      renderComponent();
      const descriptionInput = screen.getByLabelText(/Description/i);
      expect(descriptionInput).not.toBeRequired();
    });

    it('should render with empty default values', () => {
      renderComponent();
      expect(screen.getByLabelText(/Name/i)).toHaveValue('');
      expect(screen.getByLabelText(/Description/i)).toHaveValue('');
    });
  });

  describe('User input', () => {
    it('should update the Name field when user types', async () => {
      const user = userEvent.setup();
      renderComponent();

      const nameInput = screen.getByLabelText(/Name/i);
      await user.type(nameInput, 'My Experiment');

      expect(nameInput).toHaveValue('My Experiment');
    });

    it('should update the Description field when user types', async () => {
      const user = userEvent.setup();
      renderComponent();

      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, 'This is a test description');

      expect(descriptionInput).toHaveValue('This is a test description');
    });

    it('should handle multiline text in Description field', async () => {
      const user = userEvent.setup();
      renderComponent();

      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, 'Line 1{Enter}Line 2{Enter}Line 3');

      expect(descriptionInput).toHaveValue('Line 1\nLine 2\nLine 3');
    });
  });

  describe('Form validation', () => {
    it('should update form values when Name and Llama Stack secret are filled', async () => {
      const user = userEvent.setup();

      renderComponent();

      const nameInput = screen.getByLabelText(/Name/i);
      await user.type(nameInput, 'Valid Name');

      // Select a Llama Stack secret (required field)
      const selectSecretButton = screen.getByTestId('lls-secret-selector-select-secret');
      await user.click(selectSecretButton);

      await waitFor(() => {
        expect(nameInput).toHaveValue('Valid Name');
        expect(screen.getByTestId('lls-secret-selector-value')).toBeInTheDocument();
      });
    });

    it('should clear the Name field when user clears it', async () => {
      const user = userEvent.setup();
      renderComponent();

      const nameInput = screen.getByLabelText(/Name/i);
      await user.type(nameInput, 'Test Name');
      expect(nameInput).toHaveValue('Test Name');

      await user.clear(nameInput);
      expect(nameInput).toHaveValue('');
    });

    it('should clear the Description field when user clears it', async () => {
      const user = userEvent.setup();
      renderComponent();

      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, 'Test Description');
      expect(descriptionInput).toHaveValue('Test Description');

      await user.clear(descriptionInput);
      expect(descriptionInput).toHaveValue('');
    });
  });

  describe('Field attributes', () => {
    it('should have correct id for Name field', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Name/i);
      expect(nameInput).toHaveAttribute('id', 'display_name');
    });

    it('should have correct id for Description field', () => {
      renderComponent();
      const descriptionInput = screen.getByLabelText(/Description/i);
      expect(descriptionInput).toHaveAttribute('id', 'description');
    });

    it('should have type="text" for Name input', () => {
      renderComponent();
      const nameInput = screen.getByLabelText(/Name/i);
      expect(nameInput).toHaveAttribute('type', 'text');
    });
  });

  describe('Add new connection', () => {
    it('should render the Add new connection button', () => {
      renderComponent();
      expect(screen.getByTestId('add-lls-connection-button')).toBeInTheDocument();
    });

    it('should open the LlamaStackConnectionModal when button is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      expect(screen.queryByTestId('lls-connection-modal')).not.toBeInTheDocument();

      await user.click(screen.getByTestId('add-lls-connection-button'));
      expect(screen.getByTestId('lls-connection-modal')).toBeInTheDocument();
    });

    it('should close the modal when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('add-lls-connection-button'));
      expect(screen.getByTestId('lls-connection-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('lls-modal-cancel'));
      expect(screen.queryByTestId('lls-connection-modal')).not.toBeInTheDocument();
    });

    it('should close modal and update form with new connection after submit', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.click(screen.getByTestId('add-lls-connection-button'));
      expect(screen.getByTestId('lls-connection-modal')).toBeInTheDocument();

      await user.click(screen.getByTestId('lls-modal-submit'));

      await waitFor(() => {
        expect(screen.queryByTestId('lls-connection-modal')).not.toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByTestId('lls-secret-selector-value')).toHaveTextContent(
          'new-secret-uuid',
        );
      });
    });
  });

  describe('Form integration', () => {
    it('should update form state when Name is changed', async () => {
      const user = userEvent.setup();
      renderComponent();

      const nameInput = screen.getByLabelText(/Name/i);
      await user.type(nameInput, 'New Experiment Name');

      await waitFor(() => {
        expect(nameInput).toHaveValue('New Experiment Name');
      });
    });

    it('should update form state when Description is changed', async () => {
      const user = userEvent.setup();
      renderComponent();

      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, 'New experiment description');

      await waitFor(() => {
        expect(descriptionInput).toHaveValue('New experiment description');
      });
    });

    it('should handle rapid typing in Name field', async () => {
      const user = userEvent.setup();
      renderComponent();

      const nameInput = screen.getByLabelText(/Name/i);
      const longText = 'This is a very long experiment name that should be handled correctly';

      await user.type(nameInput, longText);

      await waitFor(() => {
        expect(nameInput).toHaveValue(longText);
      });
    });

    it('should handle special characters in Name field', async () => {
      const user = userEvent.setup();
      renderComponent();

      const nameInput = screen.getByLabelText(/Name/i);
      await user.type(nameInput, 'Test-Experiment_2024 (v1.0)');

      expect(nameInput).toHaveValue('Test-Experiment_2024 (v1.0)');
    });

    it('should handle special characters in Description field', async () => {
      const user = userEvent.setup();
      renderComponent();

      const descriptionInput = screen.getByLabelText(/Description/i);
      await user.type(descriptionInput, 'Testing @#$% & special characters!');

      expect(descriptionInput).toHaveValue('Testing @#$% & special characters!');
    });
  });
});
