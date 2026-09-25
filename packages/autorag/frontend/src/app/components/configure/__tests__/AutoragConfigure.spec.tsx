/* eslint-disable camelcase */
import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import type { ExplorerFiles } from '@odh-dashboard/internal/concepts/fileExplorer/types';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';
import { UIErrorHandler } from '~/app/components/common/UIError/UIErrorHandler';
import { useMaaSModelsQuery } from '~/app/hooks/queries';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import { AUTORAG_EVENTS, TrackingOutcome } from '~/app/utilities/tracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
}));

const mockUpload = jest.fn().mockResolvedValue({ key: 'uploaded.txt' });

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));
jest.mock('~/app/hooks/queries', () => ({
  ...jest.requireActual('~/app/hooks/queries'),
  useMaaSModelsQuery: jest.fn(),
  useSecretsQuery: jest.fn().mockReturnValue({ data: [], isLoading: false }),
}));
jest.mock('~/app/hooks/mutations', () => ({
  ...jest.requireActual('~/app/hooks/mutations'),
  useS3FileUploadMutation: jest.fn(() => ({ mutateAsync: mockUpload })),
}));
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({
    success: jest.fn(),
    error: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(),
    remove: jest.fn(),
  }),
}));
jest.mock('@odh-dashboard/internal/utilities/useWatchConnectionTypes', () => ({
  useWatchConnectionTypes: () => [[]],
}));
jest.mock('mod-arch-core', () => ({
  useNamespaceSelector: () => ({
    namespaces: [{ name: 'test-namespace' }],
    namespacesLoaded: true,
  }),
  asEnumMember: (value: unknown) => value,
  DeploymentMode: { Federated: 'federated', Standalone: 'standalone', Kubeflow: 'kubeflow' },
}));
jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: ({ icon, ...props }: { icon: React.ReactNode }) => (
    <button type="button" {...props}>
      {icon}
    </button>
  ),
}));

jest.mock('~/app/components/common/SecretSelector', () => ({
  __esModule: true,
  default: ({
    onChange,
    value,
    dataTestId,
  }: {
    onChange: (value: unknown) => void;
    value?: string;
    dataTestId: string;
  }) => (
    <div data-testid={dataTestId}>
      <button
        data-testid={`${dataTestId}-select-secret-1`}
        onClick={() =>
          onChange({
            uuid: 'secret-1',
            name: 'Test Secret 1',
            data: { AWS_S3_BUCKET: 'test-bucket', AWS_DEFAULT_REGION: 'us-east-1' },
            type: 's3',
            invalid: false,
          })
        }
      >
        Select Secret 1
      </button>
      <button
        data-testid={`${dataTestId}-select-invalid-secret`}
        onClick={() => onChange({ uuid: 'bad', name: 'Invalid Secret', data: {}, invalid: true })}
      >
        Select Invalid Secret
      </button>
      {value && (
        <span data-testid={`${dataTestId}-value`}>
          {value === 'secret-1' ? 'Test Secret 1' : value}
        </span>
      )}
    </div>
  ),
}));

jest.mock('@odh-dashboard/internal/concepts/fileExplorer/S3FileExplorer/S3FileExplorer', () => ({
  __esModule: true,
  default: ({
    isOpen,
    onSelectFiles,
    onClose,
    uploadFiles,
  }: {
    isOpen: boolean;
    onSelectFiles: (files: ExplorerFiles) => void;
    onClose: () => void;
    uploadFiles?: (files: File[], folder: string) => Promise<{ key: string }[]>;
  }) =>
    isOpen ? (
      <div data-testid="file-explorer-modal">
        <button
          data-testid="file-explorer-select-file"
          onClick={() => {
            onSelectFiles([{ path: '/docs/test.txt', name: 'test.txt', type: 'txt' }]);
            onClose();
          }}
        >
          Select File
        </button>
        <button
          data-testid="file-explorer-select-folder"
          onClick={() => {
            onSelectFiles([
              { path: '/docs/a.txt', name: 'a.txt', type: 'txt' },
              { path: '/docs/b.txt', name: 'b.txt', type: 'txt' },
            ]);
            onClose();
          }}
        >
          Select Folder
        </button>
        <button data-testid="file-explorer-cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          data-testid="file-explorer-upload-file"
          onClick={() => void uploadFiles?.([new File(['a'], 'uploaded.txt')], '/docs')}
        >
          Upload File
        </button>
      </div>
    ) : null,
}));

const mockParams = jest.mocked(useParams);
const mockNavigate = jest.mocked(useNavigate);
const mockModels = jest.mocked(useMaaSModelsQuery);
const trackingMock = jest.mocked(fireFormTrackingEvent);
const schema = createConfigureSchema();

const FormWrapper: React.FC<{
  children: React.ReactNode;
  defaults?: Partial<typeof schema.defaults>;
}> = ({ children, defaults }) => {
  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(schema.full),
    defaultValues: { ...schema.defaults, ...defaults },
  });
  return <FormProvider {...form}>{children}</FormProvider>;
};

const renderComponent = (defaults?: Partial<typeof schema.defaults>) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <UIErrorHandler id="test-uierror" uiErrorMappings={{}}>
        <FormWrapper defaults={defaults}>
          <AutoragConfigure />
        </FormWrapper>
      </UIErrorHandler>
    </QueryClientProvider>,
  );

const openExplorer = () => {
  fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
  fireEvent.click(screen.getByRole('button', { name: 'Add files' }));
};

describe('AutoragConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ namespace: 'test-namespace' });
    mockNavigate.mockReturnValue(jest.fn());
    mockModels.mockReturnValue({ data: { models: [] }, isLoading: false, isError: false } as never);
    mockUpload.mockResolvedValue({ key: 'uploaded.txt' });
  });

  it('should not render product source toggles or Add files without a connection', () => {
    renderComponent();
    expect(
      screen.queryByRole('group', { name: 'Choose how to add documents' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add files' })).not.toBeInTheDocument();
  });

  it('should show the unified knowledge action without a page upload zone', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));

    expect(screen.getByRole('heading', { name: 'Knowledge documents' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add files' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Browse bucket' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload file' })).not.toBeInTheDocument();
  });

  it('should commit a selected file and track the S3 source', () => {
    renderComponent();
    openExplorer();
    fireEvent.click(screen.getByTestId('file-explorer-select-file'));

    expect(screen.getByRole('button', { name: 'Replace files' })).toBeInTheDocument();
    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(trackingMock).toHaveBeenCalledWith(AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED, {
      knowledgeSourceType: 's3',
      countOfDocuments: 1,
      outcome: TrackingOutcome.submit,
      success: true,
    });
  });

  it('should preserve an existing selection when the explorer is cancelled', () => {
    renderComponent();
    openExplorer();
    fireEvent.click(screen.getByTestId('file-explorer-select-file'));
    fireEvent.click(screen.getByRole('button', { name: 'Replace files' }));
    fireEvent.click(screen.getByTestId('file-explorer-cancel'));

    expect(screen.getByText('test.txt')).toBeInTheDocument();
    expect(trackingMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED,
      expect.objectContaining({ outcome: TrackingOutcome.cancel, success: false }),
    );
  });

  it('should return all selected folder files to the product selection handler', () => {
    renderComponent();
    openExplorer();
    fireEvent.click(screen.getByTestId('file-explorer-select-folder'));

    expect(screen.getByText('a.txt')).toBeInTheDocument();
    expect(screen.queryByText('b.txt')).not.toBeInTheDocument();
    expect(trackingMock).toHaveBeenCalledWith(
      AUTORAG_EVENTS.KNOWLEDGE_SOURCE_CONFIGURED,
      expect.objectContaining({ countOfDocuments: 1 }),
    );
  });

  it('should upload through the explorer without selecting the uploaded file', async () => {
    renderComponent();
    openExplorer();
    fireEvent.click(screen.getByTestId('file-explorer-upload-file'));

    await waitFor(() =>
      expect(mockUpload).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'docs/uploaded.txt' }),
      ),
    );
    expect(screen.queryByText('uploaded.txt')).not.toBeInTheDocument();
  });

  it('should keep Add files disabled for an invalid connection', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('aws-secret-selector-select-invalid-secret'));
    expect(screen.queryByRole('button', { name: 'Add files' })).not.toBeInTheDocument();
  });
});
