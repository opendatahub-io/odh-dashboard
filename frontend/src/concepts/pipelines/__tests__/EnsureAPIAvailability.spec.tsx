import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { K8sStatusError, type K8sCondition, type ProjectKind } from '@odh-dashboard/k8s-core';
import { mockDataSciencePipelineApplicationK8sResource } from '#~/__mocks__/mockDataSciencePipelinesApplicationK8sResource';
import EnsureAPIAvailability from '#~/concepts/pipelines/EnsureAPIAvailability';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import {
  hasServerTimedOut,
  isDspaAllReady,
} from '#~/concepts/pipelines/context/usePipelineNamespaceCR';
import { K8sDspaConditionReason } from '#~/k8sTypes';
import { SERVER_TIMEOUT } from '#~/utilities/const';
// Mock the usePipelinesAPI hook
jest.mock('#~/concepts/pipelines/context', () => ({
  usePipelinesAPI: jest.fn(),
  PipelineServerTimedOut: () => <div>Pipeline server failed</div>,
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

  afterEach(() => {
    jest.restoreAllMocks();
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
      mlflowIntegrationMode: undefined,
      mlflowInjectUserEnvVars: false,
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
      mlflowIntegrationMode: undefined,
      mlflowInjectUserEnvVars: false,
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
      mlflowIntegrationMode: undefined,
      mlflowInjectUserEnvVars: false,
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

  it.each([
    {
      scenario: 'a recent readiness loss',
      reason: K8sDspaConditionReason.FailingToDeploy,
      transitionAge: SERVER_TIMEOUT / 10,
    },
    {
      scenario: 'deployment lasting longer than the timeout',
      reason: K8sDspaConditionReason.Deploying,
      transitionAge: SERVER_TIMEOUT + 60_000,
    },
  ])('should avoid the timed-out view during $scenario', ({ reason, transitionAge }) => {
    const now = Date.parse('2026-11-16T12:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const server = mockDataSciencePipelineApplicationK8sResource({});
    server.metadata.creationTimestamp = new Date(now - 14 * 24 * 60 * 60_000).toISOString();
    const readyCondition: K8sCondition = {
      type: 'Ready',
      status: 'True',
      reason: K8sDspaConditionReason.MinimumReplicasAvailable,
      lastTransitionTime: server.metadata.creationTimestamp,
    };
    server.status = {
      conditions: [{ type: 'APIServerReady', status: 'True' }, readyCondition],
    };

    mockUsePipelinesAPI.mockImplementation(() => {
      const state: [typeof server, boolean] = [server, true];
      const ready = isDspaAllReady(state);

      return {
        pipelinesServer: {
          initializing: false,
          installed: true,
          compatible: true,
          timedOut: hasServerTimedOut(state, ready),
          name: server.metadata.name,
          crStatus: server.status,
          isStarting: !ready,
        },
        namespace: 'test-project',
        project: mockProject,
        refreshAllAPI: jest.fn(),
        getRecurringRunInformation: jest.fn(),
        metadataStoreServiceClient: {} as never,
        refreshState: jest.fn(),
        managedPipelines: undefined,
        mlflowIntegrationMode: undefined,
        mlflowInjectUserEnvVars: false,
        apiAvailable: true,
        api: {} as never,
        pipelineLoadError: undefined,
      };
    });

    const page = (
      <MemoryRouter>
        <EnsureAPIAvailability>
          <div>Child content</div>
        </EnsureAPIAvailability>
      </MemoryRouter>
    );
    const { rerender } = render(page);
    expect(screen.getByText('Child content')).toBeInTheDocument();

    readyCondition.status = 'False';
    readyCondition.reason = reason;
    readyCondition.lastTransitionTime = new Date(now - transitionAge).toISOString();

    rerender(
      <MemoryRouter>
        <EnsureAPIAvailability>
          <div>Child content</div>
        </EnsureAPIAvailability>
      </MemoryRouter>,
    );

    expect(screen.getByText('Starting pipeline server')).toBeInTheDocument();
    expect(screen.queryByText('Pipeline server failed')).not.toBeInTheDocument();

    readyCondition.status = 'True';
    readyCondition.reason = K8sDspaConditionReason.MinimumReplicasAvailable;
    readyCondition.lastTransitionTime = new Date(now).toISOString();

    rerender(page);

    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(screen.queryByText('Pipeline server failed')).not.toBeInTheDocument();
  });

  it('should time out an aged server without a Ready condition only while the API server is not ready', () => {
    const now = Date.parse('2026-11-16T00:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(now);

    const server = mockDataSciencePipelineApplicationK8sResource({});
    server.metadata.creationTimestamp = new Date(now - SERVER_TIMEOUT - 60_000).toISOString();
    const apiServerReadyCondition: K8sCondition = { type: 'APIServerReady', status: 'False' };
    server.status = { conditions: [apiServerReadyCondition] };

    mockUsePipelinesAPI.mockImplementation(() => {
      const state: [typeof server, boolean] = [server, true];
      const ready = isDspaAllReady(state);

      return {
        pipelinesServer: {
          initializing: false,
          installed: true,
          compatible: true,
          timedOut: hasServerTimedOut(state, ready),
          name: server.metadata.name,
          crStatus: server.status,
          isStarting: !ready,
        },
        namespace: 'test-project',
        project: mockProject,
        refreshAllAPI: jest.fn(),
        getRecurringRunInformation: jest.fn(),
        metadataStoreServiceClient: {} as never,
        refreshState: jest.fn(),
        managedPipelines: undefined,
        mlflowIntegrationMode: undefined,
        mlflowInjectUserEnvVars: false,
        apiAvailable: true,
        api: {} as never,
        pipelineLoadError: undefined,
      };
    });

    const page = (
      <MemoryRouter>
        <EnsureAPIAvailability>
          <div>Child content</div>
        </EnsureAPIAvailability>
      </MemoryRouter>
    );
    const { rerender } = render(page);

    expect(screen.getByText('Pipeline server failed')).toBeInTheDocument();
    expect(screen.queryByText('Starting pipeline server')).not.toBeInTheDocument();

    apiServerReadyCondition.status = 'True';
    rerender(
      <MemoryRouter>
        <EnsureAPIAvailability>
          <div>Child content</div>
        </EnsureAPIAvailability>
      </MemoryRouter>,
    );

    expect(screen.getByText('Starting pipeline server')).toBeInTheDocument();
    expect(screen.queryByText('Pipeline server failed')).not.toBeInTheDocument();
  });
});
