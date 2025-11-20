import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { mockExtensions } from '../../../__tests__/mockUtils';
import { DeploymentRowExpandedSection } from '../row/DeploymentsTableRowExpandedSection';

jest.mock('@odh-dashboard/plugin-core');

jest.mock('@odh-dashboard/internal/app/AppContext', () => ({
  useAppContext: () => ({
    dashboardConfig: {
      spec: {
        modelServerSizes: [],
      },
    },
  }),
}));

jest.mock('../../../../src/concepts/extensionUtils', () => ({
  useResolvedDeploymentExtension: () => [
    {
      properties: {
        extractModelFormat: () => ({ name: 'test-model-format' }),
        extractReplicas: () => 1,
        hardwareProfilePaths: {
          containerResourcesPath: 'spec.predictor.model.resources',
          tolerationsPath: 'spec.predictor.tolerations',
          nodeSelectorPath: 'spec.predictor.nodeSelector',
        },
        extractModelAvailabilityData: () => ({
          saveAsAiAsset: true,
          saveAsMaaS: true,
          useCase: 'test-use-case',
        }),
      },
    },
  ],
}));

jest.mock('@odh-dashboard/internal/redux/hooks', () => ({
  useAppSelector: jest.fn((selector) => selector({ dashboardNamespace: 'test-namespace' })),
}));

const mockDeployment = () => ({
  modelServingPlatformId: 'test-platform',
  model: {
    apiVersion: 'v1',
    kind: 'TestModelKind',
    metadata: {
      name: 'test-deployment',
      namespace: 'test-project',
      annotations: {
        'openshift.io/description': 'test-description',
      },
    },
  },
});

const mockHardwareProfileOptions = () => ({
  podSpecOptionsState: {
    hardwareProfile: {
      formData: {
        useExistingSettings: false,
      },
      isFormDataValid: true,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
    },
    podSpecOptions: {
      resources: {
        requests: {
          cpu: '1',
          memory: '1Gi',
        },
        limits: {
          cpu: '2',
          memory: '2Gi',
        },
      },
    },
  },
  applyToResource: jest.fn((resource) => resource),
  validateHardwareProfileForm: jest.fn(() => true),
  loaded: true,
});

describe('DeploymentsTableRowExpandedSection', () => {
  beforeEach(() => {
    mockExtensions();
  });
  it('should render the expanded row with correct data', () => {
    render(
      <DeploymentRowExpandedSection
        deployment={mockDeployment()}
        isVisible
        hardwareProfileOptions={mockHardwareProfileOptions()}
      />,
    );
    // description
    expect(screen.getByText('test-description')).toBeInTheDocument();
    // model format
    expect(screen.getByText('test-model-format')).toBeInTheDocument();
    // replicas
    expect(screen.getByText('1')).toBeInTheDocument();
    // hardware profile
    expect(screen.getByText('Unknown')).toBeInTheDocument();
    // model availability
    expect(screen.getByText('AI asset endpoint, Model-as-a-Service (MaaS)')).toBeInTheDocument();
    // use case
    expect(screen.getByText('test-use-case')).toBeInTheDocument();
  });
});
