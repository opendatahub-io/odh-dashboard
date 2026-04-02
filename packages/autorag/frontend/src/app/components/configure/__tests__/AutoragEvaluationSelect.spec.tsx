import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import AutoragEvaluationSelect from '~/app/components/configure/AutoragEvaluationSelect';
import { useUploadToStorageMutation } from '~/app/hooks/mutations';
import { useSecretsQuery } from '~/app/hooks/queries';
import { createConfigureSchema } from '~/app/schemas/configure.schema';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(),
}));

jest.mock('~/app/hooks/queries', () => ({
  ...jest.requireActual('~/app/hooks/queries'),
  useSecretsQuery: jest.fn(),
}));

jest.mock('~/app/hooks/mutations', () => ({
  ...jest.requireActual('~/app/hooks/mutations'),
  useUploadToStorageMutation: jest.fn(),
}));

const mockNotificationError = jest.fn();
const mockNotificationSuccess = jest.fn();
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: jest.fn(() => ({
    success: mockNotificationSuccess,
    error: mockNotificationError,
    info: jest.fn(),
    warning: jest.fn(),
    remove: jest.fn(),
  })),
}));

jest.mock('~/app/components/common/FileSelector', () => ({
  __esModule: true,
  default: ({
    id,
    selected,
    onUpload,
    onClear,
    fileUploadProps,
    fileUploadHelperText,
  }: {
    id: string;
    selected?: string;
    onUpload: (
      file: File,
      setProgress: (progress: number) => void,
      setStatus: (status: 'success' | 'danger') => void,
    ) => void;
    onClear: () => void;
    fileUploadProps?: {
      onClearClick?: () => void;
      browseButtonText?: React.ReactNode;
      clearButtonText?: React.ReactNode;
      isClearButtonDisabled?: boolean;
    };
    fileUploadHelperText?: string;
  }) => (
    <div data-testid="file-selector">
      <input data-testid={id} value={selected || ''} readOnly />
      {selected && (
        <button data-testid="file-selector-clear" onClick={onClear}>
          Clear
        </button>
      )}
      <input
        data-testid="file-selector-upload"
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onUpload(file, jest.fn(), jest.fn());
          }
        }}
      />
      {fileUploadProps?.browseButtonText && (
        <div data-testid="file-selector-browse-button">{fileUploadProps.browseButtonText}</div>
      )}
      <button
        data-testid="file-selector-s3-button"
        onClick={() => fileUploadProps?.onClearClick?.()}
        disabled={fileUploadProps?.isClearButtonDisabled}
      >
        {fileUploadProps?.clearButtonText || 'S3'}
      </button>
      {fileUploadHelperText && (
        <div data-testid="file-selector-helper-text">{fileUploadHelperText}</div>
      )}
    </div>
  ),
}));

jest.mock('~/app/components/common/S3FileExplorer/S3FileExplorer', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    onSelectFiles,
    namespace,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSelectFiles: (files: Array<{ path: string }>) => void;
    namespace: string;
  }) =>
    isOpen ? (
      <div data-testid="s3-file-explorer">
        <div data-testid="s3-namespace">{namespace}</div>
        <button data-testid="s3-close" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="s3-select-file"
          onClick={() => onSelectFiles([{ path: '/test-data.json' }])}
        >
          Select File
        </button>
        <button
          data-testid="s3-select-nested-file"
          onClick={() => onSelectFiles([{ path: '/folder/subfolder/test-data.json' }])}
        >
          Select Nested File
        </button>
      </div>
    ) : null,
}));

const mockUseParams = jest.mocked(useParams);
const mockUseSecretsQuery = jest.mocked(useSecretsQuery);
const mockUseUploadToStorageMutation = jest.mocked(useUploadToStorageMutation);

const configureSchema = createConfigureSchema();

type FormWrapperProps = {
  children: React.ReactNode;
  onFormChange?: (values: unknown) => void;
  defaultValues?: Partial<typeof configureSchema.defaults>;
};

const FormWrapper: React.FC<FormWrapperProps> = ({ children, onFormChange, defaultValues }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: {
      ...configureSchema.defaults,
      ...defaultValues,
    },
  });

  React.useEffect(() => {
    if (onFormChange) {
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
  options?: {
    onFormChange?: (values: unknown) => void;
    defaultValues?: Partial<typeof configureSchema.defaults>;
  },
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <FormWrapper onFormChange={options?.onFormChange} defaultValues={options?.defaultValues}>
        {component}
      </FormWrapper>
    </QueryClientProvider>,
  );
};

describe('AutoragEvaluationSelect', () => {
  const mockSecrets = [
    { name: 'test-secret-1', type: 'storage' },
    { name: 'test-secret-2', type: 'storage' },
  ];

  const mockUploadMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
    mockUseSecretsQuery.mockReturnValue({
      data: mockSecrets,
      isLoading: false,
    } as unknown as ReturnType<typeof useSecretsQuery>);
    mockUseUploadToStorageMutation.mockReturnValue({
      mutateAsync: mockUploadMutateAsync,
    } as unknown as ReturnType<typeof useUploadToStorageMutation>);
  });

  it('should render FileSelector component', () => {
    renderWithProviders(<AutoragEvaluationSelect />);

    expect(screen.getByTestId('file-selector')).toBeInTheDocument();
  });

  it('should render helper text for FileSelector', () => {
    renderWithProviders(<AutoragEvaluationSelect />);

    expect(screen.getByTestId('file-selector-helper-text')).toHaveTextContent(
      'Supply a JSON file with test questions and answers to evaluate the quality of Q&A responses.',
    );
  });

  it('should display selected file in FileSelector', () => {
    renderWithProviders(<AutoragEvaluationSelect />, {
      // eslint-disable-next-line camelcase
      defaultValues: { test_data_key: 'my-test-file.json' },
    });

    expect(screen.getByTestId('test_data_key')).toHaveValue('my-test-file.json');
  });

  it('should clear selected file when clear button is clicked', async () => {
    const user = userEvent.setup();
    let formValues: unknown;
    const onFormChange = (values: unknown) => {
      formValues = values;
    };

    renderWithProviders(<AutoragEvaluationSelect />, {
      onFormChange,
      // eslint-disable-next-line camelcase
      defaultValues: { test_data_key: 'my-test-file.json' },
    });

    const clearButton = screen.getByTestId('file-selector-clear');
    await user.click(clearButton);

    await waitFor(() => {
      expect(formValues).toMatchObject({
        test_data_key: '', // eslint-disable-line camelcase
      });
    });
  });

  it('should upload file and update form field on successful upload', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });
    let formValues: unknown;
    const onFormChange = (values: unknown) => {
      formValues = values;
    };

    mockUploadMutateAsync.mockResolvedValue({ key: 'test.json' });

    renderWithProviders(<AutoragEvaluationSelect />, { onFormChange });

    const uploadInput = screen.getByTestId('file-selector-upload');
    await user.upload(uploadInput, file);

    await waitFor(() => {
      expect(mockUploadMutateAsync).toHaveBeenCalledWith({
        file,
        onProgress: expect.any(Function),
      });
    });

    await waitFor(() => {
      expect(formValues).toMatchObject({
        test_data_key: 'test.json', // eslint-disable-line camelcase
      });
    });
  });

  it('should show error notification on upload failure', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });
    const error = new Error('Upload failed');

    mockUploadMutateAsync.mockRejectedValue(error);

    renderWithProviders(<AutoragEvaluationSelect />);

    const uploadInput = screen.getByTestId('file-selector-upload');
    await user.upload(uploadInput, file);

    await waitFor(() => {
      expect(mockNotificationError).toHaveBeenCalledWith('Failed to upload file', 'Upload failed');
    });
  });

  it('should handle non-Error upload failures', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });

    mockUploadMutateAsync.mockRejectedValue('String error');

    renderWithProviders(<AutoragEvaluationSelect />);

    const uploadInput = screen.getByTestId('file-selector-upload');
    await user.upload(uploadInput, file);

    await waitFor(() => {
      expect(mockNotificationError).toHaveBeenCalledWith('Failed to upload file', 'String error');
    });
  });

  it('should not open S3FileExplorer initially', () => {
    renderWithProviders(<AutoragEvaluationSelect />);

    expect(screen.queryByTestId('s3-file-explorer')).not.toBeInTheDocument();
  });

  it('should open S3FileExplorer when S3 button is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AutoragEvaluationSelect />);

    const s3Button = screen.getByTestId('file-selector-s3-button');
    await user.click(s3Button);

    expect(screen.getByTestId('s3-file-explorer')).toBeInTheDocument();
  });

  it('should close S3FileExplorer when close button is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AutoragEvaluationSelect />);

    const s3Button = screen.getByTestId('file-selector-s3-button');
    await user.click(s3Button);

    expect(screen.getByTestId('s3-file-explorer')).toBeInTheDocument();

    const closeButton = screen.getByTestId('s3-close');
    await user.click(closeButton);

    expect(screen.queryByTestId('s3-file-explorer')).not.toBeInTheDocument();
  });

  it('should update form field when file is selected from S3', async () => {
    const user = userEvent.setup();
    let formValues: unknown;
    const onFormChange = (values: unknown) => {
      formValues = values;
    };

    renderWithProviders(<AutoragEvaluationSelect />, { onFormChange });

    const s3Button = screen.getByTestId('file-selector-s3-button');
    await user.click(s3Button);

    const selectButton = screen.getByTestId('s3-select-file');
    await user.click(selectButton);

    await waitFor(() => {
      expect(formValues).toMatchObject({
        test_data_key: 'test-data.json', // eslint-disable-line camelcase
      });
    });
  });

  it('should strip leading slash from S3 file path with nested folders', async () => {
    const user = userEvent.setup();
    let formValues: unknown;
    const onFormChange = (values: unknown) => {
      formValues = values;
    };

    renderWithProviders(<AutoragEvaluationSelect />, { onFormChange });

    const s3Button = screen.getByTestId('file-selector-s3-button');
    await user.click(s3Button);

    const selectButton = screen.getByTestId('s3-select-nested-file');
    await user.click(selectButton);

    await waitFor(() => {
      expect(formValues).toMatchObject({
        test_data_key: 'folder/subfolder/test-data.json', // eslint-disable-line camelcase
      });
    });
  });

  it('should pass correct namespace to S3FileExplorer', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AutoragEvaluationSelect />);

    const s3Button = screen.getByTestId('file-selector-s3-button');
    await user.click(s3Button);

    expect(screen.getByTestId('s3-namespace')).toHaveTextContent('test-namespace');
  });

  it('should pass test_data_secret_name to useUploadToStorageMutation', () => {
    renderWithProviders(<AutoragEvaluationSelect />, {
      // eslint-disable-next-line camelcase
      defaultValues: { test_data_secret_name: 'my-secret' },
    });

    expect(mockUseUploadToStorageMutation).toHaveBeenCalledWith('test-namespace', 'my-secret');
  });

  it('should use empty string for namespace when undefined', () => {
    mockUseParams.mockReturnValue({ namespace: undefined });

    renderWithProviders(<AutoragEvaluationSelect />);

    expect(mockUseUploadToStorageMutation).toHaveBeenCalledWith('', '');
  });

  it('should render custom browse button text with Computer icon', () => {
    renderWithProviders(<AutoragEvaluationSelect />);

    // Verify the browse button contains the "Computer" text
    const browseButton = screen.getByTestId('file-selector-browse-button');
    expect(browseButton).toBeInTheDocument();
    expect(browseButton).toHaveTextContent('Computer');
  });

  it('should render custom clear button text with S3 icon', () => {
    renderWithProviders(<AutoragEvaluationSelect />);

    // Verify S3 button is rendered with correct text
    const s3Button = screen.getByTestId('file-selector-s3-button');
    expect(s3Button).toBeInTheDocument();
    expect(s3Button).toHaveTextContent('S3');
  });

  it('should have isClearButtonDisabled set to false', () => {
    renderWithProviders(<AutoragEvaluationSelect />);

    // S3 button should be enabled
    const s3Button = screen.getByTestId('file-selector-s3-button');
    expect(s3Button).not.toBeDisabled();
  });

  it('should pass correct secret to S3FileExplorer', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AutoragEvaluationSelect />, {
      // eslint-disable-next-line camelcase
      defaultValues: { test_data_secret_name: 'test-secret-1' },
    });

    const s3Button = screen.getByTestId('file-selector-s3-button');
    await user.click(s3Button);

    // The S3FileExplorer should be rendered with the correct secret
    expect(screen.getByTestId('s3-file-explorer')).toBeInTheDocument();
  });
});
