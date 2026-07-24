import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import {
  FAST_VERSION_ANNOTATION,
  SUPPORT_STATUS_ANNOTATION,
  RUNTIME_VERSION_ANNOTATION,
} from '../../../concepts/versions';
import { Deployment, DeployedModelServingDetails } from '../../../../extension-points';
import type { ExtensionDataEntry } from '../../../concepts/extensionHelpers/usePlatformExtensionDataMap';
import DeployedModelsVersion from '../DeployedModelsVersion';

jest.mock('@odh-dashboard/plugin-core', () => ({
  LazyCodeRefComponent: jest.fn(({ props }: { props: Record<string, unknown> }) => (
    <div data-testid="lazy-component">{String(props.data ?? '')}</div>
  )),
}));

const mockLazyCodeRefComponent = jest.mocked(LazyCodeRefComponent);

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

  describe('with servingDetailsEntry', () => {
    const MockServingDetails: React.FC = () => <div>Mocked Component</div>;

    const mockServingDetailsEntry = {
      data: 'serving-data',
      extension: {
        type: 'model-serving.deployed-model/serving-runtime' as const,
        pluginID: '',
        pluginName: '',
        uid: '',
        properties: {
          platform: 'test-platform',
          ServingDetailsComponent: jest.fn(() => Promise.resolve({ default: MockServingDetails })),
        },
      },
    } as unknown as ExtensionDataEntry<DeployedModelServingDetails>;

    beforeEach(() => {
      jest.clearAllMocks();
      mockLazyCodeRefComponent.mockImplementation((({
        props,
      }: {
        props: Record<string, unknown>;
      }) => (
        <div data-testid="lazy-component">{String(props.data ?? '')}</div>
      )) as unknown as typeof mockLazyCodeRefComponent);
    });

    it('should render the serving details component via LazyCodeRefComponent', () => {
      render(
        <DeployedModelsVersion
          deployment={mockDeployment()}
          servingDetailsEntry={mockServingDetailsEntry}
        />,
      );
      expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      expect(mockLazyCodeRefComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          component: mockServingDetailsEntry.extension.properties.ServingDetailsComponent,
          props: expect.objectContaining({ data: 'serving-data' }),
        }),
        expect.anything(),
      );
    });

    it('should render serving details component with labels when annotations are present', () => {
      render(
        <DeployedModelsVersion
          deployment={mockDeployment({ [FAST_VERSION_ANNOTATION]: '1' })}
          servingDetailsEntry={mockServingDetailsEntry}
        />,
      );
      expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      expect(screen.getByTestId('fast-version-label')).toHaveTextContent('fast-1');
    });

    it('should render serving details component without labels when no annotations are present', () => {
      render(
        <DeployedModelsVersion
          deployment={mockDeployment()}
          servingDetailsEntry={mockServingDetailsEntry}
        />,
      );
      expect(screen.getByTestId('lazy-component')).toBeInTheDocument();
      expect(screen.queryByTestId('fast-version-label')).not.toBeInTheDocument();
      expect(screen.queryByTestId('limited-support-label')).not.toBeInTheDocument();
    });
  });
});
