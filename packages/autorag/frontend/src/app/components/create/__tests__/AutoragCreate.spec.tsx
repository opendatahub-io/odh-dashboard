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
jest.mock('~/app/components/common/SecretSelector', () => ({
  __esModule: true,
  default: ({
    onChange,
    value,
    dataTestId,
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
  }) => (
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
  ),
}));

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{
  children: React.ReactNode;
  onSubmit?: (data: unknown) => void;
  defaultValues?: Partial<typeof configureSchema.defaults>;
}> = ({ children, onSubmit, defaultValues }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: { ...configureSchema.defaults, ...defaultValues },
  });
  return (
    <FormProvider {...form}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (onSubmit) {
            form.handleSubmit(onSubmit)();
          }
        }}
      >
        {children}
        <button type="submit">Submit</button>
      </form>
    </FormProvider>
  );
};

const renderComponent = (
  onSubmit?: (data: unknown) => void,
  defaultValues?: Partial<typeof configureSchema.defaults>,
) =>
  render(
    <FormWrapper onSubmit={onSubmit} defaultValues={defaultValues}>
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
    it('should allow form submission when Name is filled', async () => {
      const user = userEvent.setup();
      const handleSubmit = jest.fn();

      // Provide defaults for required fields not rendered by AutoragCreate
      /* eslint-disable camelcase */
      const defaultValues = {
        input_data_secret_name: 'test-secret',
        input_data_bucket_name: 'test-bucket',
        input_data_key: 'test-key',
        test_data_secret_name: 'test-secret',
        test_data_bucket_name: 'test-bucket',
        test_data_key: 'test-key',
        llama_stack_secret_name: 'test-llama-secret',
        generation_models: ['test-model'],
        embeddings_models: ['test-embedding'],
      };
      /* eslint-enable camelcase */

      renderComponent(handleSubmit, defaultValues);

      const nameInput = screen.getByLabelText(/Name/i);
      await user.type(nameInput, 'Valid Name');

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(handleSubmit).toHaveBeenCalledTimes(1);
      });

      const [[submittedData]] = handleSubmit.mock.calls;
      /* eslint-disable camelcase */
      expect(submittedData).toMatchObject({
        display_name: 'Valid Name',
        input_data_secret_name: 'test-secret',
        llama_stack_secret_name: 'test-llama-secret',
        generation_models: ['test-model'],
        embeddings_models: ['test-embedding'],
      });
      /* eslint-enable camelcase */
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
