import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  FAST_VERSION_ANNOTATION,
  SUPPORT_STATUS_ANNOTATION,
  RUNTIME_VERSION_ANNOTATION,
} from '../../../concepts/versions';
import { Deployment } from '../../../../extension-points';
import DeployedModelsVersion from '../DeployedModelsVersion';

jest.mock('@odh-dashboard/plugin-core');

const mockDeployment = (serverAnnotations?: Record<string, string>): Deployment => ({
  modelServingPlatformId: 'test-platform',
  model: {
    apiVersion: 'v1',
    kind: 'InferenceService',
    metadata: {
      name: 'test-model',
      namespace: 'test-ns',
    },
  },
  server: {
    apiVersion: 'serving.kserve.io/v1alpha1',
    kind: 'ServingRuntime',
    metadata: {
      name: 'test-server',
      namespace: 'test-ns',
      annotations: {
        'opendatahub.io/template-display-name': 'Test Runtime',
        ...serverAnnotations,
      },
    },
  },
});

describe('DeployedModelsVersion', () => {
  it('should render the template display name', () => {
    render(<DeployedModelsVersion deployment={mockDeployment()} />);
    expect(screen.getByText('Test Runtime')).toBeInTheDocument();
  });

  it('should render dash when no server is present', () => {
    const deployment: Deployment = {
      modelServingPlatformId: 'test-platform',
      model: {
        apiVersion: 'v1',
        kind: 'InferenceService',
        metadata: { name: 'test-model', namespace: 'test-ns' },
      },
    };
    const { container } = render(<DeployedModelsVersion deployment={deployment} />);
    expect(container).toHaveTextContent('-');
  });

  it('should render the fast-version label when the server has the annotation', () => {
    render(
      <DeployedModelsVersion deployment={mockDeployment({ [FAST_VERSION_ANNOTATION]: '1' })} />,
    );
    expect(screen.getByTestId('fast-version-label')).toHaveTextContent('fast-1');
    expect(screen.getByText('Test Runtime')).toBeInTheDocument();
  });

  it('should render the limited support label when the server has the unsupported annotation', () => {
    render(
      <DeployedModelsVersion
        deployment={mockDeployment({ [SUPPORT_STATUS_ANNOTATION]: 'unsupported' })}
      />,
    );
    expect(screen.getByTestId('limited-support-label')).toHaveTextContent('Limited support');
    expect(screen.getByText('Test Runtime')).toBeInTheDocument();
  });

  it('should render all labels when server has all annotations', () => {
    render(
      <DeployedModelsVersion
        deployment={mockDeployment({
          [FAST_VERSION_ANNOTATION]: '2',
          [SUPPORT_STATUS_ANNOTATION]: 'unsupported',
          [RUNTIME_VERSION_ANNOTATION]: '0.11.0',
        })}
      />,
    );
    expect(screen.getByTestId('fast-version-label')).toHaveTextContent('fast-2');
    expect(screen.getByTestId('limited-support-label')).toHaveTextContent('Limited support');
    expect(screen.getByTestId('serving-runtime-version-label')).toHaveTextContent('0.11.0');
    expect(screen.getByText('Test Runtime')).toBeInTheDocument();
  });

  it('should not render labels when server has no relevant annotations', () => {
    render(<DeployedModelsVersion deployment={mockDeployment()} />);
    expect(screen.queryByTestId('fast-version-label')).not.toBeInTheDocument();
    expect(screen.queryByTestId('limited-support-label')).not.toBeInTheDocument();
    expect(screen.queryByTestId('serving-runtime-version-label')).not.toBeInTheDocument();
  });
});
