import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import NoPipelineServer from '#~/concepts/pipelines/NoPipelineServer';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
  CreatePipelineServerButton: ({
    children,
    title = 'Configure pipeline server',
    ...props
  }: React.PropsWithChildren<{ title?: string; isInline?: boolean; variant?: string }>) => (
    <button data-testid="create-pipeline-button" {...props}>
      {children || title}
    </button>
  ),
}));

jest.mock('#~/concepts/pipelines/content/import/ImportPipelineButton', () => ({
  __esModule: true,
  default: ({
    children,
    ...props
  }: React.PropsWithChildren<{ variant?: string; isInline?: boolean }>) => (
    <button data-testid="import-pipeline-button" {...props}>
      {children || 'Import pipeline'}
    </button>
  ),
}));

jest.mock('@odh-dashboard/ui-core', () => ({
  EmptyDetailsView: ({
    title,
    description,
    createButton,
  }: {
    title: string;
    description: string;
    createButton?: React.ReactNode;
  }) => (
    <div data-testid="empty-details-view">
      <h2>{title}</h2>
      <p>{description}</p>
      {createButton}
    </div>
  ),
}));

jest.mock('#~/concepts/design/utils', () => ({
  ProjectObjectType: { pipeline: 'pipeline' },
  typedEmptyImage: jest.fn(() => 'mock-image'),
}));

const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

describe('NoPipelineServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show the configure pipeline server button when the server is not configured', () => {
    mockUsePipelinesAPI.mockReturnValue({
      pipelinesServer: {
        initializing: false,
        installed: false,
        compatible: false,
        timedOut: false,
        name: '',
        crStatus: undefined,
        isStarting: false,
      },
      namespace: 'test-namespace',
      project: {
        apiVersion: 'v1',
        kind: 'Project',
        metadata: { name: 'test-project', annotations: {} },
      },
      refreshAllAPI: jest.fn(),
      getRecurringRunInformation: jest.fn(),
      metadataStoreServiceClient: {} as never,
      refreshState: jest.fn(),
      managedPipelines: undefined,
      mlflowIntegrationMode: undefined,
      apiAvailable: false,
      api: {} as never,
      pipelineLoadError: undefined,
    });

    render(<NoPipelineServer variant="primary" />);

    const configureButton = screen.getByTestId('create-pipeline-button');
    expect(configureButton).toBeInTheDocument();
    expect(configureButton).toBeEnabled();
    expect(screen.getByText('Configure a pipeline server')).toBeInTheDocument();
  });
});
