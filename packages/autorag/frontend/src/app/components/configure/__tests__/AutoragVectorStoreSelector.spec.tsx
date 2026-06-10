import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AutoragVectorStoreSelector from '~/app/components/configure/AutoragVectorStoreSelector';
import { useOgxVectorStoreProvidersQuery } from '~/app/hooks/queries';
import { mockVectorStoreProvidersResponse } from '~/__mocks__/mockVectorStore';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(),
}));

jest.mock('~/app/hooks/queries', () => ({
  ...jest.requireActual('~/app/hooks/queries'),
  useOgxVectorStoreProvidersQuery: jest.fn(),
}));

const mockNotificationError = jest.fn();
const mockNotificationWarning = jest.fn();
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(() => ({
    success: jest.fn(),
    error: mockNotificationError,
    info: jest.fn(),
    warning: mockNotificationWarning,
    remove: jest.fn(),
  })),
}));

const mockUseParams = jest.mocked(useParams);
const mockUseOgxVectorStoreProvidersQuery = jest.mocked(useOgxVectorStoreProvidersQuery);

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
    mockUseOgxVectorStoreProvidersQuery.mockReturnValue({
      data: mockVectorStoreProvidersResponse(),
      isLoading: false,
    } as unknown as ReturnType<typeof useOgxVectorStoreProvidersQuery>);
  });

  it('should display placeholder text when no provider is selected', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    const toggle = screen.getByTestId('vector-store-select-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveTextContent('Select vector I/O provider');
  });

  it('should show vector store provider options when clicking the toggle', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));

    expect(screen.getByTestId('vector-store-option-milvus')).toBeInTheDocument();
    expect(screen.getByText('milvus (remote Milvus)')).toBeInTheDocument();
    expect(screen.getByTestId('vector-store-option-pgvector')).toBeInTheDocument();
    expect(screen.getByText('pgvector (remote Pgvector)')).toBeInTheDocument();
  });

  it('should update toggle text when a provider is selected', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));
    fireEvent.click(screen.getByText('milvus (remote Milvus)'));

    expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent(
      'milvus (remote Milvus)',
    );
  });

  it('should render and allow selection when pgvector is the only provider', async () => {
    mockUseOgxVectorStoreProvidersQuery.mockReturnValue({
      data: mockVectorStoreProvidersResponse([
        { provider_id: 'pgvector', provider_type: 'remote::pgvector' }, // eslint-disable-line camelcase
      ]),
      isLoading: false,
    } as unknown as ReturnType<typeof useOgxVectorStoreProvidersQuery>);

    let formValues: unknown;
    renderWithProviders(<AutoragVectorStoreSelector />, {
      onFormChange: (values: unknown) => {
        formValues = values;
      },
    });

    const toggle = screen.getByTestId('vector-store-select-toggle');
    expect(toggle).not.toBeDisabled();

    fireEvent.click(toggle);
    expect(screen.getByTestId('vector-store-option-pgvector')).toBeInTheDocument();
    expect(screen.queryByTestId('vector-store-option-milvus')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('pgvector (remote Pgvector)'));

    await waitFor(() => {
      expect(formValues).toMatchObject({
        vector_io_provider_id: 'pgvector', // eslint-disable-line camelcase
      });
    });
  });

  it('should exclude unsupported provider types from the dropdown', () => {
    mockUseOgxVectorStoreProvidersQuery.mockReturnValue({
      data: mockVectorStoreProvidersResponse([
        { provider_id: 'milvus', provider_type: 'remote::milvus' }, // eslint-disable-line camelcase
        { provider_id: 'pgvector', provider_type: 'remote::pgvector' }, // eslint-disable-line camelcase
      ]),
      isLoading: false,
    } as unknown as ReturnType<typeof useOgxVectorStoreProvidersQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);
    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));

    expect(screen.getByTestId('vector-store-option-milvus')).toBeInTheDocument();
    expect(screen.getByTestId('vector-store-option-pgvector')).toBeInTheDocument();
    expect(screen.queryByTestId('vector-store-option-unsupported')).not.toBeInTheDocument();
  });

  it('should show only API providers in the dropdown', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));

    // Supported remote providers should be present
    expect(screen.getByTestId('vector-store-option-milvus')).toBeInTheDocument();
    expect(screen.getByTestId('vector-store-option-pgvector')).toBeInTheDocument();

    // In-memory provider should NOT be present (disabled until 3.5)
    expect(
      screen.queryByTestId('vector-store-option-MILVUS_IN_MEMORY_DEFAULT'),
    ).not.toBeInTheDocument();
  });

  it('should disable the toggle when no providers are available', () => {
    mockUseOgxVectorStoreProvidersQuery.mockReturnValue({
      data: { vector_store_providers: [], totalProviderCount: 0 }, // eslint-disable-line camelcase
      isLoading: false,
    } as unknown as ReturnType<typeof useOgxVectorStoreProvidersQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    const toggle = screen.getByTestId('vector-store-select-toggle');
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveTextContent('No vector I/O providers available');
  });

  it('should disable the toggle and show error notification when fetching providers fails', () => {
    mockUseOgxVectorStoreProvidersQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useOgxVectorStoreProvidersQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    const toggle = screen.getByTestId('vector-store-select-toggle');
    expect(toggle).toBeDisabled();
    expect(mockNotificationError).toHaveBeenCalledWith(
      'Failed to load vector I/O providers.',
      expect.anything(), // Error message may include details from ogx BFF in the future.
    );
  });

  it('should show warning notification when providers exist but none are supported', () => {
    mockUseOgxVectorStoreProvidersQuery.mockReturnValue({
      data: { vector_store_providers: [], totalProviderCount: 2 }, // eslint-disable-line camelcase
      isLoading: false,
    } as unknown as ReturnType<typeof useOgxVectorStoreProvidersQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    expect(mockNotificationWarning).toHaveBeenCalledWith(
      'No compatible vector I/O providers found.',
      expect.anything(),
    );
    const warningMessage = mockNotificationWarning.mock.calls[0][1] as React.ReactElement;
    const { container: warningContainer } = render(warningMessage);
    expect(warningContainer).toHaveTextContent(/remote Milvus or PGVector provider/);
  });

  it('should not show warning notification when no providers exist at all', () => {
    mockUseOgxVectorStoreProvidersQuery.mockReturnValue({
      data: { vector_store_providers: [], totalProviderCount: 0 }, // eslint-disable-line camelcase
      isLoading: false,
    } as unknown as ReturnType<typeof useOgxVectorStoreProvidersQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    expect(mockNotificationWarning).not.toHaveBeenCalled();
  });

  it('should show a loading skeleton when providers are loading', () => {
    mockUseOgxVectorStoreProvidersQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useOgxVectorStoreProvidersQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    expect(screen.queryByTestId('vector-store-select-toggle')).not.toBeInTheDocument();
    expect(document.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
  });

  describe('Form field value integration', () => {
    it('should set default field value to empty string', async () => {
      let formValues: unknown;
      const onFormChange = (values: unknown) => {
        formValues = values;
      };

      renderWithProviders(<AutoragVectorStoreSelector />, { onFormChange });

      expect(screen.getByTestId('vector-store-select-toggle')).toBeInTheDocument();

      await waitFor(() => {
        expect(formValues).toBeDefined();
      });

      expect(formValues).toMatchObject({
        vector_io_provider_id: '', // eslint-disable-line camelcase
      });
    });

    it('should update field value to provider_id when selecting a provider', async () => {
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
          vector_io_provider_id: 'milvus', // eslint-disable-line camelcase
        });
      });

      // Verify the display text updated
      expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent(
        'milvus (remote Milvus)',
      );
    });

    it('should update field value when selecting pgvector provider', async () => {
      let formValues: unknown;
      const onFormChange = (values: unknown) => {
        formValues = values;
      };

      renderWithProviders(<AutoragVectorStoreSelector />, { onFormChange });

      fireEvent.click(screen.getByTestId('vector-store-select-toggle'));
      fireEvent.click(screen.getByText('pgvector (remote Pgvector)'));

      await waitFor(() => {
        expect(formValues).toMatchObject({
          vector_io_provider_id: 'pgvector', // eslint-disable-line camelcase
        });
      });

      expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent(
        'pgvector (remote Pgvector)',
      );
    });

    it('should display provider with provider_id format', () => {
      renderWithProviders(<AutoragVectorStoreSelector />);

      fireEvent.click(screen.getByTestId('vector-store-select-toggle'));

      // Verify the display format shows provider_id with deployment and name
      expect(screen.getByText('milvus (remote Milvus)')).toBeInTheDocument();
      expect(screen.getByTestId('vector-store-option-milvus')).toBeInTheDocument();
    });
  });
});
