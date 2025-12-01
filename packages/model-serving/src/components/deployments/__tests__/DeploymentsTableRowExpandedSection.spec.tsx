import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { mockExtensions } from '../../../__tests__/mockUtils';
import { DeploymentRowExpandedSection } from '../row/DeploymentsTableRowExpandedSection';

jest.mock('@odh-dashboard/plugin-core');

jest.mock('@odh-dashboard/internal/concepts/areas/index', () => ({
  SupportedArea: {
    DS_PROJECT_SCOPED: 'DS_PROJECT_SCOPED',
    DS_PIPELINES: 'DS_PIPELINES',
  },
  useIsAreaAvailable: () => ({ status: false }),
  conditionalArea: () => (Component: React.ComponentType<unknown>) => Component,
}));

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

const mockUseModelServingHardwareProfile = jest.fn();

jest.mock('../../deploymentWizard/useModelServingHardwareProfile.ts', () => ({
  useModelServingHardwareProfile: (...args: unknown[]) =>
    mockUseModelServingHardwareProfile(...args),
}));

const createMockHardwareProfileResult = () => ({
  podSpecOptionsState: {
    hardwareProfile: {
      formData: {
        selectedProfile: undefined,
        useExistingSettings: false,
      },
      initialHardwareProfile: undefined,
      isFormDataValid: false,
      setFormData: jest.fn(),
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    },
    podSpecOptions: {
      resources: {
        requests: { cpu: '2', memory: '4Gi' },
        limits: { cpu: '2', memory: '4Gi' },
      },
    },
  },
  applyToResource: jest.fn(),
  validateHardwareProfileForm: jest.fn(),
  loaded: true,
  error: undefined,
});

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
describe('DeploymentsTableRowExpandedSection', () => {
  beforeEach(() => {
    mockExtensions();
    mockUseModelServingHardwareProfile.mockReturnValue(createMockHardwareProfileResult());
  });

  afterEach(() => {
    mockUseModelServingHardwareProfile.mockReset();
  });
  it('should render the expanded row with correct data', () => {
    render(
      <DeploymentRowExpandedSection
        deployment={mockDeployment()}
        isVisible
        hardwareProfilePaths={{
          containerResourcesPath: 'spec.predictor.model.resources',
          tolerationsPath: 'spec.predictor.tolerations',
          nodeSelectorPath: 'spec.predictor.nodeSelector',
        }}
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
    expect(screen.getByText('Model-as-a-Service (MaaS)')).toBeInTheDocument();
    // use case
    expect(screen.getByText('test-use-case')).toBeInTheDocument();
  });
});
