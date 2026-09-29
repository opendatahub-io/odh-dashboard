/* eslint-disable camelcase */
import { zodResolver } from '@hookform/resolvers/zod';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router';
import type { ExplorerFiles } from '@odh-dashboard/internal/concepts/fileExplorer/types';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import AutomlConfigure from '~/app/components/configure/AutomlConfigure';
import { useS3GetFileSchemaQuery } from '~/app/hooks/queries';
import { createConfigureSchema } from '~/app/schemas/configure.schema';
import { AUTOML_EVENTS } from '~/app/utilities/tracking';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

const mockUpload = jest.fn().mockResolvedValue({ key: 'uploaded.csv' });

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('~/app/hooks/queries');
jest.mock('~/app/hooks/mutations', () => ({
  ...jest.requireActual<typeof import('~/app/hooks/mutations')>('~/app/hooks/mutations'),
  useS3FileUploadMutation: jest.fn(() => ({ mutateAsync: mockUpload })),
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
            onSelectFiles([{ path: '/data.csv', name: 'data.csv', type: 'csv' }]);
            onClose();
          }}
        >
          Select File
        </button>
        <button data-testid="file-explorer-cancel" onClick={onClose}>
          Cancel
        </button>
        <button
          data-testid="file-explorer-upload-file"
          onClick={() => void uploadFiles?.([new File(['a'], 'uploaded.csv')], '/')}
        >
          Upload File
        </button>
      </div>
    ) : null,
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
            data: { AWS_S3_BUCKET: 'test-bucket-1', AWS_DEFAULT_REGION: 'us-east-1' },
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

jest.mock('@odh-dashboard/internal/utilities/useWatchConnectionTypes', () => ({
  useWatchConnectionTypes: () => [[]],
}));
jest.mock('~/app/components/common/AutomlConnectionModal', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: ({ icon, ...props }: { icon: React.ReactNode }) => (
    <button type="button" {...props}>
      {icon}
    </button>
  ),
}));

const mockGetSchema = jest.mocked(useS3GetFileSchemaQuery);
const mockNavigate = jest.mocked(useNavigate);
const mockParams = jest.mocked(useParams);
const trackingMock = jest.mocked(fireMiscTrackingEvent);
const schema = createConfigureSchema();

const columns = [
  { name: 'target', type: 'string' as const, task_type: 'binary' as const, unique_count: 2 },
];

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
      <FormWrapper defaults={defaults}>
        <AutomlConfigure />
      </FormWrapper>
    </QueryClientProvider>,
  );

describe('AutomlConfigure', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams.mockReturnValue({ namespace: 'test-namespace' });
    mockNavigate.mockReturnValue(jest.fn());
    mockGetSchema.mockReturnValue({ data: columns, isLoading: false } as never);
    mockUpload.mockResolvedValue({ key: 'uploaded.csv' });
  });

  it('should hide Add files until a valid S3 connection is selected', () => {
    renderComponent();
    expect(screen.queryByRole('button', { name: 'Add files' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('aws-secret-selector-select-invalid-secret'));
    expect(screen.queryByRole('button', { name: 'Add files' })).not.toBeInTheDocument();
  });

  it('should show Training data and Add files without source toggles or a page upload zone', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));

    expect(screen.getByRole('heading', { name: 'Training data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add files' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Browse bucket' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Upload file' })).not.toBeInTheDocument();
  });

  it('should open the explorer and commit the existing single-file form state on selection', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Add files' }));
    fireEvent.click(screen.getByTestId('file-explorer-select-file'));

    expect(screen.getByRole('button', { name: 'Replace files' })).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Selected training data file' })).toBeInTheDocument();
    expect(screen.getByText('data.csv')).toBeInTheDocument();
    expect(trackingMock).toHaveBeenCalledWith(AUTOML_EVENTS.TRAINING_DATA_CONFIGURED, {
      trainingDataSourceType: 'select',
    });
  });

  it('should preserve the current selection when the explorer is cancelled', () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Add files' }));
    fireEvent.click(screen.getByTestId('file-explorer-select-file'));
    fireEvent.click(screen.getByRole('button', { name: 'Replace files' }));
    fireEvent.click(screen.getByTestId('file-explorer-cancel'));

    expect(screen.getByText('data.csv')).toBeInTheDocument();
  });

  it('should upload through the explorer without treating upload completion as selection', async () => {
    renderComponent();
    fireEvent.click(screen.getByTestId('aws-secret-selector-select-secret-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Add files' }));
    fireEvent.click(screen.getByTestId('file-explorer-upload-file'));

    await waitFor(() => expect(mockUpload).toHaveBeenCalled());
    expect(
      screen.queryByRole('grid', { name: 'Selected training data file' }),
    ).not.toBeInTheDocument();
  });
});
