import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { K8sStatusError } from '#~/api/errorUtils';
import { ProjectKind } from '#~/k8sTypes';

// Mock the usePipelinesAPI hook
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
}));

const mockUsePipelinesAPI = jest.mocked(usePipelinesAPI);

const mockProject: ProjectKind = {
  apiVersion: 'v1',
  kind: 'Project',
  metadata: {
    name: 'test-project',
    annotations: {},
  },
};

describe('EnsureAPIAvailability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render UnauthorizedError when pipelineLoadError is a 403 error', () => {
    const forbiddenError = new K8sStatusError({
      kind: 'Status',
      apiVersion: 'v1',
      status: 'Failure',
      message: 'Forbidden',
      reason: 'Forbidden',
      code: 403,
    });

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
      project: mockProject,
      refreshAllAPI: jest.fn(),
      getRecurringRunInformation: jest.fn(),
      metadataStoreServiceClient: {} as never,
      refreshState: jest.fn(),
      managedPipelines: undefined,
      apiAvailable: false,
      api: {} as never,
      pipelineLoadError: forbiddenError,
    });

    render(
      <MemoryRouter>
        <EnsureAPIAvailability>
          <div>Child content</div>
        </EnsureAPIAvailability>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('unauthorized-error')).toBeInTheDocument();
    expect(
      screen.getByText('To access pipelines, ask your administrator to adjust your permissions.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Child content')).not.toBeInTheDocument();
  });

  it('should render error alert when pipelineLoadError is a non-403 error', () => {
    const genericError = new Error('Some pipeline error');

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
      project: mockProject,
      refreshAllAPI: jest.fn(),
      getRecurringRunInformation: jest.fn(),
      metadataStoreServiceClient: {} as never,
      refreshState: jest.fn(),
      managedPipelines: undefined,
      apiAvailable: false,
      api: {} as never,
      pipelineLoadError: genericError,
    });

    render(
      <MemoryRouter>
        <EnsureAPIAvailability>
          <div>Child content</div>
        </EnsureAPIAvailability>
      </MemoryRouter>,
    );

    expect(screen.getByText('Pipelines load error')).toBeInTheDocument();
    expect(screen.getByText('Some pipeline error')).toBeInTheDocument();
    expect(screen.queryByText('Child content')).not.toBeInTheDocument();
  });

  it('should render children when no error and API is available', () => {
    mockUsePipelinesAPI.mockReturnValue({
      pipelinesServer: {
        initializing: false,
        installed: true,
        compatible: true,
        timedOut: false,
        name: 'dspa',
        crStatus: { conditions: [{ type: 'Ready', status: 'True' }] },
        isStarting: false,
      },
      namespace: 'test-namespace',
      project: mockProject,
      refreshAllAPI: jest.fn(),
      getRecurringRunInformation: jest.fn(),
      metadataStoreServiceClient: {} as never,
      refreshState: jest.fn(),
      managedPipelines: undefined,
      apiAvailable: true,
      api: {} as never,
      pipelineLoadError: undefined,
    });

    render(
      <MemoryRouter>
        <EnsureAPIAvailability>
          <div>Child content</div>
        </EnsureAPIAvailability>
      </MemoryRouter>,
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});
