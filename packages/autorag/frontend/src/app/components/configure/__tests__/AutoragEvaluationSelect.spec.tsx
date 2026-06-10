import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import AutoragEvaluationSelect from '~/app/components/configure/AutoragEvaluationSelect';
import { useUploadToStorageMutation } from '~/app/hooks/mutations';
import { useSecretsQuery } from '~/app/hooks/queries';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import {
  AUTORAG_UPLOAD_MAX_BYTES,
  AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
} from '~/app/utilities/dropzoneFileUpload';

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

/**
 * Minimal FileList for jsdom. Supports indexed access, `item`, and `for...of`; not every browser FileList edge case.
 */
function createFileList(fileArr: File[]): FileList {
  const arr = [...fileArr];
  const list = Object.assign(arr, {
    length: arr.length,
    item(index: number): File | null {
      return arr[index] ?? null;
    },
    *[Symbol.iterator]() {
      for (let i = 0; i < arr.length; i++) {
        yield arr[i];
      }
    },
  });
  return list as unknown as FileList;
}

/** Partial `DataTransfer` for tests — jsdom has no real API; react-dropzone reads `types`/`files` on drop. */
function mockDataTransferForDrop(files: File[]) {
  return {
    files: createFileList(files),
    types: ['Files'],
    dropEffect: 'copy',
    effectAllowed: 'all',
  };
}

const EVALUATION_UPLOAD_ZONE_TEST_ID = 'evaluation-upload-zone';

/** Drop target is `FileUpload` with `data-testid={EVALUATION_UPLOAD_ZONE_TEST_ID}` (see AutoragEvaluationSelect). */
function dropFilesOnEvaluationFileUpload(container: HTMLElement, files: File[]): void {
  fireEvent.drop(within(container).getByTestId(EVALUATION_UPLOAD_ZONE_TEST_ID), {
    dataTransfer: mockDataTransferForDrop(files),
  });
}

/**
 * Native file input for browse/change simulation. PF `FileUpload` renders it internally and does not
 * expose `getInputProps` customization, so we scope under `evaluation-upload-zone` (same pattern as
 * Cypress: `[data-testid="…"] input[type="file"]`).
 */
function getEvaluationFileInput(container: HTMLElement): HTMLInputElement {
  const input = within(container)
    .getByTestId(EVALUATION_UPLOAD_ZONE_TEST_ID)
    .querySelector('input[type="file"]');
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(`file input not found under [data-testid="${EVALUATION_UPLOAD_ZONE_TEST_ID}"]`);
  }
  return input;
}

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

    // FileSelector renders a TextInputGroup with a file input
    expect(screen.getByPlaceholderText('No file selected')).toBeInTheDocument();
  });

  it('should render helper text for FileSelector', () => {
    renderWithProviders(<AutoragEvaluationSelect />);

    expect(
      screen.getByText(
        'Supply a JSON file with test questions and answers to evaluate the quality of Q&A responses.',
      ),
    ).toBeInTheDocument();
  });

  it('should display selected file in FileSelector', () => {
    renderWithProviders(<AutoragEvaluationSelect />, {
      // eslint-disable-next-line camelcase
      defaultValues: { test_data_key: 'my-test-file.json' },
    });

    expect(screen.getByDisplayValue('my-test-file.json')).toBeInTheDocument();
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

    const clearButton = screen.getByRole('button', { name: /clear file/i });
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

    const { container } = renderWithProviders(<AutoragEvaluationSelect />, { onFormChange });

    const uploadInput = getEvaluationFileInput(container);
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

  describe('evaluation file upload validation', () => {
    it('should show a notification when a disallowed file type is dropped', async () => {
      const { container } = renderWithProviders(<AutoragEvaluationSelect />);
      const badFile = new File(['x'], 'run.exe', { type: 'application/octet-stream' });
      mockUploadMutateAsync.mockClear();
      dropFilesOnEvaluationFileUpload(container, [badFile]);

      expect(mockUploadMutateAsync).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith(
          'Invalid file type',
          'Evaluation dataset must be a JSON file (.json).',
        );
      });
    });

    it('should show a notification when an oversized file is dropped', async () => {
      const { container } = renderWithProviders(<AutoragEvaluationSelect />);
      const largeFile = new File(['x'], 'big.json', { type: 'application/json' });
      Object.defineProperty(largeFile, 'size', { value: AUTORAG_UPLOAD_MAX_BYTES + 1 });
      mockUploadMutateAsync.mockClear();
      dropFilesOnEvaluationFileUpload(container, [largeFile]);

      expect(mockUploadMutateAsync).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith(
          'File too large',
          'File size must be 32 MiB or less.',
        );
      });
    });

    it('should show a notification when more than one file is dropped', async () => {
      const { container } = renderWithProviders(<AutoragEvaluationSelect />);
      const fileA = new File(['{}'], 'a.json', { type: 'application/json' });
      const fileB = new File(['{}'], 'b.json', { type: 'application/json' });
      mockUploadMutateAsync.mockClear();
      dropFilesOnEvaluationFileUpload(container, [fileA, fileB]);

      expect(mockUploadMutateAsync).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith(
          'Too many files',
          AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
        );
      });
    });

    it('should not upload a valid file when dropped together with an invalid file', async () => {
      const { container } = renderWithProviders(<AutoragEvaluationSelect />);
      const goodFile = new File(['{}'], 'eval.json', { type: 'application/json' });
      const badFile = new File(['x'], 'run.exe', { type: 'application/octet-stream' });
      mockUploadMutateAsync.mockClear();
      dropFilesOnEvaluationFileUpload(container, [goodFile, badFile]);

      expect(mockUploadMutateAsync).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith(
          'File not accepted',
          `${AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL} Evaluation dataset must be a JSON file (.json).`,
        );
      });
    });

    it('should not upload a disallowed file type from the file input and should notify', async () => {
      const file = new File(['x'], 'run.exe', { type: 'application/octet-stream' });
      const { container } = renderWithProviders(<AutoragEvaluationSelect />);

      mockUploadMutateAsync.mockClear();
      fireEvent.change(getEvaluationFileInput(container), { target: { files: [file] } });

      expect(mockUploadMutateAsync).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith(
          'Invalid file type',
          'Evaluation dataset must be a JSON file (.json).',
        );
      });
    });

    it('should not upload an oversized file from the file input and should notify', async () => {
      const file = new File(['x'], 'big.json', { type: 'application/json' });
      Object.defineProperty(file, 'size', { value: AUTORAG_UPLOAD_MAX_BYTES + 1 });
      const { container } = renderWithProviders(<AutoragEvaluationSelect />);

      mockUploadMutateAsync.mockClear();
      fireEvent.change(getEvaluationFileInput(container), { target: { files: [file] } });

      expect(mockUploadMutateAsync).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(mockNotificationError).toHaveBeenCalledWith(
          'File too large',
          'File size must be 32 MiB or less.',
        );
      });
    });
  });

  it('should show error notification on upload failure', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });
    const error = new Error('Upload failed');

    mockUploadMutateAsync.mockRejectedValue(error);

    const { container } = renderWithProviders(<AutoragEvaluationSelect />);

    const uploadInput = getEvaluationFileInput(container);
    await user.upload(uploadInput, file);

    await waitFor(() => {
      expect(mockNotificationError).toHaveBeenCalledWith('Failed to upload file', 'Upload failed');
    });
  });

  it('should handle non-Error upload failures', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });

    mockUploadMutateAsync.mockRejectedValue('String error');

    const { container } = renderWithProviders(<AutoragEvaluationSelect />);

    const uploadInput = getEvaluationFileInput(container);
    await user.upload(uploadInput, file);

    await waitFor(() => {
      expect(mockNotificationError).toHaveBeenCalledWith('Failed to upload file', 'String error');
    });
  });

  it('should show human-readable error for max collision attempts (409)', async () => {
    const user = userEvent.setup();
    const file = new File(['test content'], 'test.json', { type: 'application/json' });
    const error = new Error('unable to find unique filename after 10 attempts');

    mockUploadMutateAsync.mockRejectedValue(error);

    const { container } = renderWithProviders(<AutoragEvaluationSelect />);

    await user.upload(getEvaluationFileInput(container), file);

    await waitFor(() => {
      expect(mockNotificationError).toHaveBeenCalledWith(
        'Failed to upload file',
        'A file with this name already exists and no unique name could be generated. Please rename your file or delete existing files with similar names.',
      );
    });
  });

  it('should not open S3FileExplorer initially', () => {
    renderWithProviders(<AutoragEvaluationSelect />);

    expect(screen.queryByTestId('s3-file-explorer')).not.toBeInTheDocument();
  });

  it('should open S3FileExplorer when S3 button is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AutoragEvaluationSelect />);

    // The FileUpload's clear button displays "S3" text
    const s3Button = screen.getByRole('button', { name: /s3/i });
    await user.click(s3Button);

    expect(screen.getByTestId('s3-file-explorer')).toBeInTheDocument();
  });

  it('should close S3FileExplorer when close button is clicked', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AutoragEvaluationSelect />);

    const s3Button = screen.getByRole('button', { name: /s3/i });
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

    const s3Button = screen.getByRole('button', { name: /s3/i });
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

    const s3Button = screen.getByRole('button', { name: /s3/i });
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

    const s3Button = screen.getByRole('button', { name: /s3/i });
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
    const browseButton = screen.getByRole('button', { name: /computer/i });
    expect(browseButton).toBeInTheDocument();
    expect(browseButton).toHaveTextContent('Computer');
  });

  it('should render custom clear button text with S3 icon', () => {
    renderWithProviders(<AutoragEvaluationSelect />);

    // Verify S3 button is rendered with correct text
    const s3Button = screen.getByRole('button', { name: /s3/i });
    expect(s3Button).toBeInTheDocument();
    expect(s3Button).toHaveTextContent('S3');
  });

  it('should have isClearButtonDisabled set to false', () => {
    renderWithProviders(<AutoragEvaluationSelect />);

    // S3 button should be enabled
    const s3Button = screen.getByRole('button', { name: /s3/i });
    expect(s3Button).not.toBeDisabled();
  });

  it('should pass correct secret to S3FileExplorer', async () => {
    const user = userEvent.setup();

    renderWithProviders(<AutoragEvaluationSelect />, {
      // eslint-disable-next-line camelcase
      defaultValues: { test_data_secret_name: 'test-secret-1' },
    });

    const s3Button = screen.getByRole('button', { name: /s3/i });
    await user.click(s3Button);

    // The S3FileExplorer should be rendered with the correct secret
    expect(screen.getByTestId('s3-file-explorer')).toBeInTheDocument();
  });
});
