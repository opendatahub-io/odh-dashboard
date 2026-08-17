import React from 'react';
import { render, screen } from '@testing-library/react';
import type { FetchStateObject } from '@odh-dashboard/ui-core/hooks/useFetch';
import type { TemplateKind } from '@odh-dashboard/k8s-core';
import type { ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import { mockServingRuntimeK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeK8sResource';
import { mockServingRuntimeTemplateK8sResource } from '@odh-dashboard/model-serving/__mocks__/mockServingRuntimeTemplateK8sResource';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { SERVING_RUNTIME_SCOPE } from '@odh-dashboard/internal/pages/modelServing/screens/const';
import type { KServeDeployment } from '../../types';
import DeploymentServingDetails from '../deploymentServingDetails';
import { useFetchTemplate } from '../../api/template';

// The project-scoped template fetch is the piece we drive per-test.
jest.mock('../../api/template', () => ({
  useFetchTemplate: jest.fn(),
  useFetchTemplates: jest.fn(),
}));

// Project-scoped label gating is not under test here; keep the area off.
jest.mock('@odh-dashboard/plugin-core/areas', () => ({
  useIsAreaAvailable: jest.fn(() => ({ status: false })),
  SupportedArea: { DS_PROJECT_SCOPED: 'ds-project-scoped' },
}));

// Version labels rendered from the serving runtime itself are noise for these assertions.
jest.mock('@odh-dashboard/model-serving/shared/components', () => ({
  renderDeploymentResourceVersionLabels: () => null,
}));

const mockUseFetchTemplate = jest.mocked(useFetchTemplate);

const fetchState = <T,>(data: T, loaded = false, error?: Error): FetchStateObject<T> => ({
  data,
  loaded,
  error,
  refresh: jest.fn(),
});

// The component only reads `deployment.server`.
const makeDeployment = (server: ServingRuntimeKind | undefined): KServeDeployment =>
  ({ server } as unknown as KServeDeployment);

const TEMPLATE_REMOVED = 'serving-runtime-template-status-label';
const VERSION_STATUS = 'serving-runtime-version-status-label';

beforeEach(() => {
  jest.clearAllMocks();
  // Default: project fetch disabled and idle.
  mockUseFetchTemplate.mockReturnValue(fetchState<TemplateKind | undefined>(undefined));
});

describe('DeploymentServingDetails', () => {
  it('should render "Unknown" when there is no serving runtime', () => {
    render(<DeploymentServingDetails deployment={makeDeployment(undefined)} />);

    expect(screen.getByText('Unknown')).toBeInTheDocument();
    expect(screen.queryByTestId(TEMPLATE_REMOVED)).not.toBeInTheDocument();
  });

  it('should show the version status and no "template removed" label when the global template is found', () => {
    const server = mockServingRuntimeK8sResource({ templateName: 'ovms', version: '1.0.0' });
    const globalTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'ovms',
      version: '1.0.0',
    });

    render(
      <DeploymentServingDetails
        deployment={makeDeployment(server)}
        data={fetchState([globalTemplate], true)}
      />,
    );

    expect(screen.queryByTestId(TEMPLATE_REMOVED)).not.toBeInTheDocument();
    // Runtime version matches the template version -> "Latest".
    expect(screen.getByTestId(VERSION_STATUS)).toHaveTextContent('Latest');
  });

  it('should not trigger the project-scoped fetch when the global template is found', () => {
    const server = mockServingRuntimeK8sResource({ templateName: 'ovms', version: '1.0.0' });
    const globalTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'ovms',
      version: '1.0.0',
    });

    render(
      <DeploymentServingDetails
        deployment={makeDeployment(server)}
        data={fetchState([globalTemplate], true)}
      />,
    );

    // The project fetch is gated off (third arg false), so no project-scoped API call is made.
    expect(mockUseFetchTemplate).toHaveBeenCalledWith('ovms', server.metadata.namespace, false);
    expect(mockUseFetchTemplate).not.toHaveBeenCalledWith('ovms', server.metadata.namespace, true);
  });

  it('should show the "template removed" label when the template is not found anywhere', () => {
    const server = mockServingRuntimeK8sResource({ templateName: 'ovms', version: '1.0.0' });
    // Global list loaded but empty -> the component falls back to the project fetch, which also
    // resolves with nothing.
    mockUseFetchTemplate.mockReturnValue(fetchState<TemplateKind | undefined>(undefined, true));

    render(
      <DeploymentServingDetails deployment={makeDeployment(server)} data={fetchState([], true)} />,
    );

    expect(screen.getByTestId(TEMPLATE_REMOVED)).toHaveTextContent('Template removed');
  });

  // Regression guard for the flicker bug: while global templates are still loading (not loaded, no
  // error) and the project fetch is disabled, the missing-template label must not appear.
  it('should not show the "template removed" label while global templates are still loading', () => {
    const server = mockServingRuntimeK8sResource({ templateName: 'ovms', version: '1.0.0' });

    render(
      <DeploymentServingDetails deployment={makeDeployment(server)} data={fetchState([], false)} />,
    );

    expect(screen.queryByTestId(TEMPLATE_REMOVED)).not.toBeInTheDocument();
  });

  it('should resolve a project-scoped template and use its version', () => {
    const server = mockServingRuntimeK8sResource({
      templateName: 'ovms',
      version: '2.0.0',
      scope: SERVING_RUNTIME_SCOPE.Project,
    });
    const projectTemplate = mockServingRuntimeTemplateK8sResource({
      name: 'ovms',
      version: '2.0.0',
    });
    mockUseFetchTemplate.mockReturnValue(
      fetchState<TemplateKind | undefined>(projectTemplate, true),
    );

    render(
      <DeploymentServingDetails deployment={makeDeployment(server)} data={fetchState([], true)} />,
    );

    expect(screen.queryByTestId(TEMPLATE_REMOVED)).not.toBeInTheDocument();
    // Runtime version matches the project template version -> "Latest".
    expect(screen.getByTestId(VERSION_STATUS)).toHaveTextContent('Latest');
  });
});
