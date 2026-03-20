import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useParams } from 'react-router';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import AutoragVectorStoreSelector from '~/app/components/configure/AutoragVectorStoreSelector';
import { useLlamaStackVectorStoresQuery } from '~/app/hooks/queries';
import { mockVectorStoresResponse } from '~/__mocks__/mockVectorStore';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(),
}));

jest.mock('~/app/hooks/queries', () => ({
  ...jest.requireActual('~/app/hooks/queries'),
  useLlamaStackVectorStoresQuery: jest.fn(),
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
const mockUseLlamaStackVectorStoresQuery = jest.mocked(useLlamaStackVectorStoresQuery);

const configureSchema = createConfigureSchema();

const FormWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: configureSchema.defaults,
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FormWrapper>{component}</FormWrapper>
    </QueryClientProvider>,
  );
};

describe('AutoragVectorStoreSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
    mockUseLlamaStackVectorStoresQuery.mockReturnValue({
      data: mockVectorStoresResponse(),
      isLoading: false,
    } as unknown as ReturnType<typeof useLlamaStackVectorStoresQuery>);
  });

  it('should display placeholder text when no vector store is selected', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    const toggle = screen.getByTestId('vector-store-select-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveTextContent('Select vector index');
  });

  it('should show vector store options when clicking the toggle', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));

    expect(
      screen.getByTestId('vector-store-option-vs_00000000-0000-0000-0000-000000000001'),
    ).toBeInTheDocument();
    expect(screen.getByText('test-milvus-store')).toBeInTheDocument();
  });

  it('should update toggle text when a vector store is selected', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));
    fireEvent.click(screen.getByText('test-milvus-store'));

    expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent('test-milvus-store');
  });

  it('should deselect vector store when clicking the same option again', () => {
    renderWithProviders(<AutoragVectorStoreSelector />);

    // Select
    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));
    fireEvent.click(screen.getByText('test-milvus-store'));
    expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent('test-milvus-store');

    // Re-open and deselect by clicking the option inside the dropdown list
    fireEvent.click(screen.getByTestId('vector-store-select-toggle'));
    const selectList = screen.getByTestId('vector-store-select-list');
    fireEvent.click(within(selectList).getByText('test-milvus-store'));
    expect(screen.getByTestId('vector-store-select-toggle')).toHaveTextContent(
      'Select vector index',
    );
  });

  it('should disable the toggle and show empty message when no vector stores are available', () => {
    mockUseLlamaStackVectorStoresQuery.mockReturnValue({
      data: mockVectorStoresResponse([]),
      isLoading: false,
    } as unknown as ReturnType<typeof useLlamaStackVectorStoresQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    const toggle = screen.getByTestId('vector-store-select-toggle');
    expect(toggle).toBeDisabled();
    expect(toggle).toHaveTextContent('No vector stores available');
  });

  it('should disable the toggle and show error notification when fetching vector stores fails', () => {
    mockUseLlamaStackVectorStoresQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    } as unknown as ReturnType<typeof useLlamaStackVectorStoresQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    const toggle = screen.getByTestId('vector-store-select-toggle');
    expect(toggle).toBeDisabled();
    expect(mockNotificationError).toHaveBeenCalledWith('Failed to load vector stores');
  });

  it('should show a loading skeleton when vector stores are loading', () => {
    mockUseLlamaStackVectorStoresQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useLlamaStackVectorStoresQuery>);

    renderWithProviders(<AutoragVectorStoreSelector />);

    expect(screen.queryByTestId('vector-store-select-toggle')).not.toBeInTheDocument();
    expect(document.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
  });
});
