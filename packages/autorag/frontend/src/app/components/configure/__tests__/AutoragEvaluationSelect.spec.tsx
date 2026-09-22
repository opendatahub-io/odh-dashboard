/* eslint-disable camelcase */
import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useParams } from 'react-router';
import type {
  ExplorerFiles,
  FileExplorerUploadConfig,
} from '@odh-dashboard/internal/concepts/fileExplorer/types';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import AutoragEvaluationSelect from '~/app/components/configure/AutoragEvaluationSelect';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import { AUTORAG_EVENTS, TrackingOutcome } from '~/app/utilities/tracking';
import { RunTriggeredTrackingContext } from '~/app/context/RunTriggeredTrackingContext';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

const mockUpload = jest.fn().mockResolvedValue({ key: 'uploaded.json' });

jest.mock('~/app/hooks/mutations', () => ({
  ...jest.requireActual('~/app/hooks/mutations'),
  useS3FileUploadMutation: jest.fn(() => ({ mutateAsync: mockUpload })),
}));

jest.mock('~/app/components/configure/EvaluationFileCreator', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    onCreated,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onCreated: (key: string) => void;
  }) =>
    isOpen ? (
      <div data-testid="evaluation-creator-modal">
        <button data-testid="creator-close" onClick={onClose}>
          Close
        </button>
        <button data-testid="creator-submit" onClick={() => onCreated('created-eval.json')}>
          Submit
        </button>
      </div>
    ) : null,
}));

jest.mock('@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onClose,
    onSelectFiles,
    namespace,
    uploadFiles,
    uploadConfig,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSelectFiles: (files: ExplorerFiles) => void;
    namespace: string;
    uploadFiles?: (files: File[], folder: string) => Promise<{ key: string }[]>;
    uploadConfig?: FileExplorerUploadConfig;
  }) =>
    isOpen ? (
      <div data-testid="s3-file-explorer">
        <div data-testid="s3-namespace">{namespace}</div>
        <div data-testid="s3-upload-picker-config">{JSON.stringify(uploadConfig)}</div>
        <button data-testid="s3-close" onClick={onClose}>
          Close
        </button>
        <button
          data-testid="s3-select-file"
          onClick={() => {
            onSelectFiles([{ path: '/test-data.json', name: 'test-data.json', type: 'json' }]);
            onClose();
          }}
        >
          Select File
        </button>
        <button
          data-testid="s3-select-nested-file"
          onClick={() => {
            onSelectFiles([
              { path: '/folder/subfolder/test-data.json', name: 'test-data.json', type: 'json' },
            ]);
            onClose();
          }}
        >
          Select Nested File
        </button>
        <button
          data-testid="s3-upload-file"
          onClick={() => void uploadFiles?.([new File(['{}'], 'uploaded.json')], '/')}
        >
          Upload File
        </button>
      </div>
    ) : null,
}));

const mockUseParams = jest.mocked(useParams);
const fireFormTrackingEventMock = jest.mocked(fireFormTrackingEvent);
const configureSchema = createConfigureSchema();

type FormWrapperProps = {
  children: React.ReactNode;
  defaultValues?: Partial<typeof configureSchema.defaults>;
};

const FormWrapper: React.FC<FormWrapperProps> = ({ children, defaultValues }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: { ...configureSchema.defaults, ...defaultValues },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const renderComponent = (
  defaultValues?: Partial<typeof configureSchema.defaults>,
  onEvaluationSourceConfigured?: (sourceType: string) => void,
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const content = (
    <QueryClientProvider client={queryClient}>
      <FormWrapper defaultValues={defaultValues}>
        <AutoragEvaluationSelect />
      </FormWrapper>
    </QueryClientProvider>
  );
  return render(
    onEvaluationSourceConfigured ? (
      <RunTriggeredTrackingContext.Provider
        value={{
          onKnowledgeSourceConfigured: jest.fn(),
          onEvaluationSourceConfigured,
          onVectorStoreConfigured: jest.fn(),
          onModelsConfigured: jest.fn(),
        }}
      >
        {content}
      </RunTriggeredTrackingContext.Provider>
    ) : (
      content
    ),
  );
};

describe('AutoragEvaluationSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ namespace: 'test-namespace' });
    mockUpload.mockResolvedValue({ key: 'uploaded.json' });
  });

  it('should show the placeholder and Add file action when no dataset is selected', () => {
    renderComponent({ test_data_secret_name: 'test-secret' });

    expect(screen.getByPlaceholderText('No file selected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add file' })).toBeEnabled();
    expect(screen.getByTestId('evaluation-file-actions')).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Clear file' })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('No file selected')).toHaveAttribute('readonly');
  });

  it('should show the full selected key in the readonly input title', () => {
    renderComponent({
      test_data_secret_name: 'test-secret',
      test_data_key: 'folder/selected.json',
    });

    expect(screen.getByDisplayValue('folder/selected.json')).toHaveAttribute(
      'title',
      'folder/selected.json',
    );
  });

  it('should open the JSON-only explorer from Add file', async () => {
    const user = userEvent.setup();
    renderComponent({ test_data_secret_name: 'test-secret' });

    await user.click(screen.getByRole('button', { name: 'Add file' }));
    expect(screen.getByTestId('s3-file-explorer')).toBeInTheDocument();
    expect(screen.getByTestId('s3-namespace')).toHaveTextContent('test-namespace');
  });

  it('should update test_data_key only after explicit S3 selection', async () => {
    const user = userEvent.setup();
    renderComponent({ test_data_secret_name: 'test-secret' });

    const input = screen.getByPlaceholderText('No file selected');
    expect(input).toHaveValue('');
    await user.click(screen.getByRole('button', { name: 'Add file' }));
    await user.click(screen.getByTestId('s3-select-file'));

    await waitFor(() => expect(screen.getByDisplayValue('test-data.json')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Clear file' })).toBeInTheDocument();
  });

  it('should preserve the existing selection when the explorer is cancelled', async () => {
    const user = userEvent.setup();
    renderComponent({ test_data_secret_name: 'test-secret', test_data_key: 'existing.json' });

    await user.click(screen.getByRole('button', { name: 'Add file' }));
    await user.click(screen.getByTestId('s3-close'));
    expect(screen.getByDisplayValue('existing.json')).toBeInTheDocument();
  });

  it('should clear a selected dataset', async () => {
    const user = userEvent.setup();
    renderComponent({ test_data_secret_name: 'test-secret', test_data_key: 'existing.json' });

    await user.click(screen.getByRole('button', { name: 'Clear file' }));
    expect(screen.getByPlaceholderText('No file selected')).toHaveValue('');
  });

  it('should open the creator from the split-button menu', async () => {
    const user = userEvent.setup();
    renderComponent({ test_data_secret_name: 'test-secret' });

    await user.click(screen.getByTestId('evaluation-file-actions'));
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    expect(
      screen.getByRole('menuitem', { name: 'Create new evaluation dataset' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Create new evaluation dataset' }));
    expect(screen.getByTestId('evaluation-creator-modal')).toBeInTheDocument();
  });

  it('should pass JSON upload constraints to the unified explorer', async () => {
    const user = userEvent.setup();
    renderComponent({ test_data_secret_name: 'test-secret' });

    await user.click(screen.getByRole('button', { name: 'Add file' }));
    expect(screen.getByTestId('s3-upload-picker-config')).toHaveTextContent('application/json');
    expect(screen.getByTestId('s3-upload-picker-config')).toHaveTextContent('maxFiles');
  });

  it('should set test_data_key when the creator creates a dataset', async () => {
    const user = userEvent.setup();
    renderComponent({ test_data_secret_name: 'test-secret' });

    await user.click(screen.getByTestId('evaluation-file-actions'));
    await user.click(screen.getByRole('menuitem', { name: 'Create new evaluation dataset' }));
    await user.click(screen.getByTestId('creator-submit'));
    expect(screen.getByDisplayValue('created-eval.json')).toBeInTheDocument();
  });

  it('should pass uploaded files to the unified explorer without selecting them', async () => {
    const user = userEvent.setup();
    renderComponent({ test_data_secret_name: 'test-secret' });

    await user.click(screen.getByRole('button', { name: 'Add file' }));
    await user.click(screen.getByTestId('s3-upload-file'));
    await waitFor(() => expect(mockUpload).toHaveBeenCalled());
    expect(screen.getByPlaceholderText('No file selected')).toHaveValue('');
  });

  describe('source tracking', () => {
    it('should track an explicit S3 selection and notify run-triggered tracking', async () => {
      const user = userEvent.setup();
      const onEvaluationSourceConfigured = jest.fn();
      renderComponent({ test_data_secret_name: 'test-secret' }, onEvaluationSourceConfigured);

      await user.click(screen.getByRole('button', { name: 'Add file' }));
      await user.click(screen.getByTestId('s3-select-file'));
      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.EVALUATION_SOURCE_CONFIGURED,
        {
          evaluationSourceType: 's3',
          countOfDocuments: 1,
          outcome: TrackingOutcome.submit,
          success: true,
        },
      );
      expect(onEvaluationSourceConfigured).toHaveBeenCalledWith('s3');
    });

    it('should track cancellation without notifying run-triggered tracking', async () => {
      const user = userEvent.setup();
      const onEvaluationSourceConfigured = jest.fn();
      renderComponent({ test_data_secret_name: 'test-secret' }, onEvaluationSourceConfigured);

      await user.click(screen.getByRole('button', { name: 'Add file' }));
      await user.click(screen.getByTestId('s3-close'));
      expect(fireFormTrackingEventMock).toHaveBeenCalledWith(
        AUTORAG_EVENTS.EVALUATION_SOURCE_CONFIGURED,
        expect.objectContaining({ outcome: TrackingOutcome.cancel, success: false }),
      );
      expect(onEvaluationSourceConfigured).not.toHaveBeenCalled();
    });
  });
});
