import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AutoragVectorStoreSelector from '~/app/components/configure/AutoragVectorStoreSelector';
import { useLlamaStackVectorStoreProvidersQuery } from '~/app/hooks/queries';
import { mockVectorStoreProvidersResponse } from '~/__mocks__/mockVectorStore';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(),
}));

jest.mock('~/app/hooks/queries', () => ({
  ...jest.requireActual('~/app/hooks/queries'),
  useLlamaStackVectorStoreProvidersQuery: jest.fn(),
}));

const mockNotificationError = jest.fn();
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(() => ({
    success: jest.fn(),
    error: mockNotificationError,
    info: jest.fn(),
    warning: jest.fn(),
    remove: jest.fn(),
  })),
}));

const mockUseParams = jest.mocked(useParams);
const mockUseLlamaStackVectorStoreProvidersQuery = jest.mocked(
  useLlamaStackVectorStoreProvidersQuery,
);

const configureSchema = createConfigureSchema();

type FormWrapperProps = {
  children: React.ReactNode;
  onFormChange?: (values: unknown) => void;
};

const FormWrapper: React.FC<FormWrapperProps> = ({ children, onFormChange }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: configureSchema.defaults,
  });

  React.useEffect(() => {
    if (onFormChange) {
      // Call with initial values
      onFormChange(form.getValues());

      const subscription = form.watch((values) => {
        onFormChange(values);
      });
      return () => subscription.unsubscribe();
    }
    return undefined;
  }, [form, onFormChange]);

  return <FormProvider {...form}>{children}</FormProvider>;
};

const renderWithProviders = (
  component: React.ReactElement,
  options?: { onFormChange?: (values: unknown) => void },
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FormWrapper onFormChange={options?.onFormChange}>{component}</FormWrapper>
    </QueryClientProvider>,
  );
};

describe('AutoragVectorStoreSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
    mockUseLlamaStackVectorStoreProvidersQuery.mockReturnValue({
      data: mockVectorStoreProvidersResponse(),
      isLoading: false,
    } as unknown as ReturnType<typeof useLlamaStackVectorStoreProvidersQuery>);
  });

  it('should display default in-memory provider when no other provider is selected', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    const toggle = screen.getByTestId('vector-store-select-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveTextContent('ChromaDB (in-memory)');
  });

  it('should show vector store provider options when clicking the toggle', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));

    expect(screen.getByTestId('vector-store-option-milvus')).toBeInTheDocument();
    expect(screen.getByText('milvus (remote Milvus)')).toBeInTheDocument();
  });

  it('should update toggle text when a provider is selected', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));
    fireEvent.click(screen.getByText('milvus (remote Milvus)'));

    expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent(
      'milvus (remote Milvus)',
    );
  });

  it('should show both in-memory and API providers in the dropdown', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));

    // In-memory provider should be available
    expect(screen.getByTestId('vector-store-option-MILVUS_IN_MEMORY_DEFAULT')).toBeInTheDocument();

    // API provider should be present
    expect(screen.getByTestId('vector-store-option-milvus')).toBeInTheDocument();
  });

  it('should show default in-memory provider when no API providers are available', () => {
    mockUseLlamaStackVectorStoreProvidersQuery.mockReturnValue({
      data: mockVectorStoreProvidersResponse([]),
      isLoading: false,
    } as unknown as ReturnType<typeof useLlamaStackVectorStoreProvidersQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    const toggle = screen.getByTestId('vector-store-select-toggle');
    expect(toggle).not.toBeDisabled();
    expect(toggle).toHaveTextContent('ChromaDB (in-memory)');

    // Verify in-memory provider is available in the dropdown
    fireEvent.click(toggle);
    expect(screen.getByTestId('vector-store-option-MILVUS_IN_MEMORY_DEFAULT')).toBeInTheDocument();
  });

  it('should disable the toggle and show error notification when fetching providers fails', () => {
    mockUseLlamaStackVectorStoreProvidersQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useLlamaStackVectorStoreProvidersQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    const toggle = screen.getByTestId('vector-store-select-toggle');
    expect(toggle).toBeDisabled();
    expect(mockNotificationError).toHaveBeenCalledWith('Failed to load vector store providers');
  });

  it('should show a loading skeleton when providers are loading', () => {
    mockUseLlamaStackVectorStoreProvidersQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useLlamaStackVectorStoreProvidersQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    expect(screen.queryByTestId('vector-store-select-toggle')).not.toBeInTheDocument();
    expect(document.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
  });

  describe('Form field value integration', () => {
    it('should set default field value to ls_MILVUS_IN_MEMORY_DEFAULT', async () => {
      let formValues: unknown;
      const onFormChange = (values: unknown) => {
        formValues = values;
      };

      renderWithProviders(<AutoragVectorStoreSelector />, { onFormChange });

      // Wait for initial render and form setup
      expect(screen.getByTestId('vector-store-select-toggle')).toBeInTheDocument();

      // Wait for form values to be set
      await waitFor(() => {
        expect(formValues).toBeDefined();
      });

      // Check the form field value
      expect(formValues).toMatchObject({
        llama_stack_vector_database_id: 'ls_MILVUS_IN_MEMORY_DEFAULT', // eslint-disable-line camelcase
      });
    });

    it('should update field value to ls_{provider_id} when selecting a provider', async () => {
      let formValues: unknown;
      const onFormChange = (values: unknown) => {
        formValues = values;
      };

      renderWithProviders(<AutoragVectorStoreSelector />, { onFormChange });

      // Open dropdown and select the milvus provider
      fireEvent.click(screen.getByTestId('vector-store-select-toggle'));
      fireEvent.click(screen.getByText('milvus (remote Milvus)'));

      // Wait for field value to update
      await waitFor(() => {
        expect(formValues).toMatchObject({
          llama_stack_vector_database_id: 'ls_milvus', // eslint-disable-line camelcase
        });
      });

      // Verify the display text updated
      expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent(
        'milvus (remote Milvus)',
      );
    });

    it('should display provider with new ls_{provider_id} format', () => {
      renderWithProviders(<AutoragVectorStoreSelector />);

      fireEvent.click(screen.getByTestId('vector-store-select-toggle'));

      // Verify the display format shows provider_id with deployment and name
      expect(screen.getByText('milvus (remote Milvus)')).toBeInTheDocument();
      expect(screen.getByTestId('vector-store-option-milvus')).toBeInTheDocument();
    });
  });
});
