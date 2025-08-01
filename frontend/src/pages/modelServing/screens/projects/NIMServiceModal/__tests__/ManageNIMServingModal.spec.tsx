import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ManageNIMServingModal from '#~/pages/modelServing/screens/projects/NIMServiceModal/ManageNIMServingModal';
import { mockStorageClasses } from '#~/__mocks__';
import { InferenceServiceKind, ServingRuntimeKind, ProjectKind, SecretKind } from '#~/k8sTypes';
import { ServingRuntimeEditInfo } from '#~/pages/modelServing/screens/types';
import * as utils from '#~/pages/modelServing/screens/projects/utils';
import * as useNIMPVCModule from '#~/pages/modelServing/screens/projects/NIMServiceModal/useNIMPVC';
import * as podSpecOptionsModule from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import * as storageConfigModule from '#~/pages/projects/screens/spawner/storage/useGetStorageClassConfig';
import * as StorageClassSelectModule from '#~/pages/projects/screens/spawner/storage/StorageClassSelect';
import * as useDefaultStorageClassModule from '#~/pages/projects/screens/spawner/storage/useDefaultStorageClass';

// Mock dependencies
jest.mock('#~/pages/modelServing/screens/projects/utils', () => ({
  createNIMPVC: jest.fn(),
  createNIMSecret: jest.fn(),
  getSubmitInferenceServiceResourceFn: jest.fn(() => jest.fn()),
  getSubmitServingRuntimeResourcesFn: jest.fn(() => jest.fn()),
  useCreateInferenceServiceObject: jest.fn(),
  useCreateServingRuntimeObject: jest.fn(),
}));

jest.mock('#~/pages/modelServing/customServingRuntimes/useCustomServingRuntimesEnabled', () => ({
  __esModule: true,
  default: jest.fn(() => true),
}));

jest.mock('#~/concepts/areas', () => ({
  SupportedArea: {
    K_SERVE_AUTH: 'k-serve-auth',
    STORAGE_CLASSES: 'storage-classes',
  },
  useIsAreaAvailable: jest.fn(() => ({ status: true })),
}));

jest.mock('#~/api', () => ({
  getSecret: jest.fn(),
  updatePvc: jest.fn(),
  useAccessReview: jest.fn(() => [true]),
}));

jest.mock('#~/pages/modelServing/screens/projects/nimUtils', () => ({
  getNIMServingRuntimeTemplate: jest.fn(),
  updateServingRuntimeTemplate: jest.fn(),
}));

jest.mock('#~/redux/selectors', () => ({
  useDashboardNamespace: jest.fn(() => ({ dashboardNamespace: 'test-namespace' })),
}));

jest.mock('#~/pages/modelServing/customServingRuntimes/utils', () => ({
  getServingRuntimeFromTemplate: jest.fn(),
}));

jest.mock('#~/pages/modelServing/screens/projects/useNIMTemplateName', () => ({
  useNIMTemplateName: jest.fn(() => 'test-template'),
}));

jest.mock('#~/pages/modelServing/screens/projects/NIMServiceModal/useNIMPVC', () => ({
  useNIMPVC: jest.fn(),
}));

jest.mock('#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState', () => ({
  useModelServingPodSpecOptionsState: jest.fn(),
}));

jest.mock('#~/pages/modelServing/useKServeDeploymentMode', () => ({
  useKServeDeploymentMode: jest.fn(() => ({
    isRawAvailable: true,
    isServerlessAvailable: true,
  })),
}));

jest.mock('#~/pages/projects/screens/spawner/storage/StorageClassSelect', () => ({
  __esModule: true,
  default: jest.fn((props) => {
    const {
      disableStorageClassSelect,
      showDefaultWhenNoConfig,
      storageClasses,
      storageClassesLoaded,
    } = props;

    // If storage classes are not loaded, render a Skeleton (like the real component)
    if (!storageClassesLoaded) {
      return <div data-testid="storage-class-skeleton">Loading...</div>;
    }

    const hasStorageClassConfigs = storageClasses?.some(
      (sc: { metadata?: { annotations?: Record<string, string> } }) =>
        sc.metadata?.annotations?.['opendatahub.io/sc-config'],
    );
    const shouldShowDefaultOnly = showDefaultWhenNoConfig && !hasStorageClassConfigs;
    const isDisabled = disableStorageClassSelect || shouldShowDefaultOnly;

    return (
      <div data-testid="storage-class-select" data-disabled={isDisabled}>
        Storage Class Select
      </div>
    );
  }),
}));

jest.mock('#~/pages/projects/screens/spawner/storage/useDefaultStorageClass', () => ({
  __esModule: true,
  useDefaultStorageClass: jest.fn(() => [mockStorageClasses[0]]),
}));

jest.mock('#~/pages/modelServing/screens/projects/useModelDeploymentNotification', () => ({
  useModelDeploymentNotification: jest.fn(() => ({
    watchDeployment: jest.fn(),
  })),
}));

jest.mock('#~/pages/projects/screens/spawner/storage/useGetStorageClassConfig', () => ({
  useGetStorageClassConfig: jest.fn(),
}));

// Mock child components
jest.mock('../NIMModelDeploymentNameSection', () => ({
  __esModule: true,
  default: jest.fn(() => (
    <div data-testid="nim-model-deployment-name-section">Model Name Section</div>
  )),
}));

jest.mock('../NIMModelListSection', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="nim-model-list-section">Model List Section</div>),
}));

jest.mock('../NIMPVCSizeSection', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="nim-pvc-size-section">PVC Size Section</div>),
}));

jest.mock('../../InferenceServiceModal/ProjectSection', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="project-section">Project Section</div>),
}));

jest.mock('../../ServingRuntimeModal/ServingRuntimeSizeSection', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="serving-runtime-size-section">Size Section</div>),
}));

jest.mock('../../kServeModal/KServeAutoscalerReplicaSection', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="autoscaler-replica-section">Replica Section</div>),
}));

jest.mock('../../ServingRuntimeModal/AuthServingRuntimeSection', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="auth-serving-runtime-section">Auth Section</div>),
}));

jest.mock('../../kServeModal/KServeDeploymentModeDropdown', () => ({
  KServeDeploymentModeDropdown: jest.fn(() => (
    <div data-testid="deployment-mode-dropdown">Deployment Mode</div>
  )),
}));

jest.mock('../NoAuthAlert', () => ({
  NoAuthAlert: jest.fn(() => <div data-testid="no-auth-alert">No Auth Alert</div>),
}));

jest.mock('#~/concepts/dashboard/DashboardModalFooter', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-testid="modal-footer">Modal Footer</div>),
}));

const mockUseCreateInferenceServiceObject = utils.useCreateInferenceServiceObject as jest.Mock;
const mockUseCreateServingRuntimeObject = utils.useCreateServingRuntimeObject as jest.Mock;
const mockUseNIMPVC = useNIMPVCModule.useNIMPVC as jest.Mock;
const mockUseModelServingPodSpecOptionsState =
  podSpecOptionsModule.useModelServingPodSpecOptionsState as jest.Mock;
const mockUseGetStorageClassConfig = storageConfigModule.useGetStorageClassConfig as jest.Mock;
const mockStorageClassSelect = StorageClassSelectModule.default as jest.Mock;
const mockUseDefaultStorageClass = useDefaultStorageClassModule.useDefaultStorageClass as jest.Mock;

describe('ManageNIMServingModal', () => {
  const mockOnClose = jest.fn();
  const mockProjectContext = {
    currentProject: {
      metadata: {
        name: 'test-project',
      },
    } as ProjectKind,
  };

  const mockServingRuntime: ServingRuntimeKind = {
    apiVersion: 'serving.kserve.io/v1beta1',
    kind: 'ServingRuntime',
    metadata: {
      name: 'test-serving-runtime',
      namespace: 'test-namespace',
    },
    spec: {
      containers: [],
    },
  };

  const mockEditInfo = {
    servingRuntimeEditInfo: {
      servingRuntime: mockServingRuntime,
      secrets: [] as SecretKind[],
    } as ServingRuntimeEditInfo,
    inferenceServiceEditInfo: {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      metadata: {
        name: 'test-inference-service',
        namespace: 'test-namespace',
      },
      spec: {
        predictor: {
          model: {
            modelFormat: {
              name: 'test-format',
            },
          },
        },
      },
    } as InferenceServiceKind,
  };

  const defaultMockInferenceServiceData = {
    name: 'test-model',
    project: 'test-project',
    k8sName: 'test-model',
    isKServeRawDeployment: false,
    format: { name: 'test-model-format' },
  };

  const defaultMockServingRuntimeData = {
    numReplicas: 1,
    imageName: 'test-image',
  };

  const defaultMockPodSpecOptionsState = {
    modelSize: {
      setSelectedSize: jest.fn(),
      sizes: [
        {
          name: 'Custom',
          resources: {
            limits: { cpu: '16', memory: '64Gi' },
            requests: { cpu: '8', memory: '32Gi' },
          },
        },
      ],
    },
    podSpecOptions: {
      resources: {
        limits: { cpu: '16', memory: '64Gi' },
        requests: { cpu: '8', memory: '32Gi' },
      },
    },
    hardwareProfile: {
      isFormDataValid: true,
      resetFormData: jest.fn(),
    },
    acceleratorProfile: {
      resetFormData: jest.fn(),
    },
  };

  const defaultMockStorageClassConfig = {
    storageClasses: mockStorageClasses,
    storageClassesLoaded: true,
    selectedStorageClassConfig: mockStorageClasses[0],
  };

  const defaultMockNIMPVC = {
    pvcSize: '30Gi',
    setPvcSize: jest.fn(),
    pvc: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseCreateInferenceServiceObject.mockReturnValue([
      defaultMockInferenceServiceData,
      jest.fn(),
      jest.fn(),
    ]);

    mockUseCreateServingRuntimeObject.mockReturnValue([
      defaultMockServingRuntimeData,
      jest.fn(),
      jest.fn(),
    ]);

    mockUseNIMPVC.mockReturnValue(defaultMockNIMPVC);
    mockUseModelServingPodSpecOptionsState.mockReturnValue(defaultMockPodSpecOptionsState);

    // Setup default storage class mocks with correct FetchState format
    mockUseDefaultStorageClass.mockReturnValue([mockStorageClasses[0], true, null, jest.fn()]);
    mockUseGetStorageClassConfig.mockReturnValue({
      storageClasses: [mockStorageClasses[0], mockStorageClasses[1]],
      storageClassesLoaded: true,
      selectedStorageClassConfig: mockStorageClasses[0],
    });
  });

  describe('Rendering', () => {
    it('renders the modal with correct title for new deployment', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      expect(screen.getByText('Deploy model with NVIDIA NIM')).toBeInTheDocument();
      expect(
        screen.getByText('Configure properties for deploying your model using an NVIDIA NIM.'),
      ).toBeInTheDocument();
    });

    it('renders the modal with correct title for editing', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} editInfo={mockEditInfo} />);
      expect(screen.getByText('Edit model with NVIDIA NIM')).toBeInTheDocument();
    });

    it('renders all required sections', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      expect(screen.getByTestId('project-section')).toBeInTheDocument();
      expect(screen.getByTestId('nim-model-deployment-name-section')).toBeInTheDocument();
      expect(screen.getByTestId('nim-model-list-section')).toBeInTheDocument();
      expect(screen.getByTestId('nim-pvc-size-section')).toBeInTheDocument();
      expect(screen.getByTestId('autoscaler-replica-section')).toBeInTheDocument();
      expect(screen.getByTestId('serving-runtime-size-section')).toBeInTheDocument();
      expect(screen.getByTestId('auth-serving-runtime-section')).toBeInTheDocument();
      expect(screen.getByTestId('deployment-mode-dropdown')).toBeInTheDocument();
    });

    it('renders storage class select when storage classes are available', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      expect(screen.getByTestId('storage-class-select')).toBeInTheDocument();
    });

    it('does not render storage class select when storage classes are not available', () => {
      mockUseGetStorageClassConfig.mockReturnValue({
        ...defaultMockStorageClassConfig,
        storageClassesLoaded: false,
      });
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      expect(screen.queryByTestId('storage-class-select')).not.toBeInTheDocument();
    });
  });

  describe('Storage Class Selection', () => {
    it('passes correct props to StorageClassSelect', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      expect(mockStorageClassSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          storageClasses: mockStorageClasses,
          storageClassesLoaded: true,
          selectedStorageClassConfig: mockStorageClasses[0],
          isRequired: true,
          disableStorageClassSelect: false,
          showDefaultWhenNoConfig: true,
        }),
        expect.anything(),
      );
    });

    it('disables storage class select when editing', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} editInfo={mockEditInfo} />);
      expect(mockStorageClassSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          disableStorageClassSelect: true,
        }),
        expect.anything(),
      );
    });

    it('uses deployed storage class when editing with existing PVC', () => {
      const mockPVC = {
        metadata: { name: 'test-pvc' },
        spec: {
          storageClassName: 'deployed-storage-class',
          resources: { requests: { storage: '50Gi' } },
        },
      };
      mockUseNIMPVC.mockReturnValue({
        ...defaultMockNIMPVC,
        pvc: mockPVC,
        pvcSize: '50Gi',
      });
      render(<ManageNIMServingModal onClose={mockOnClose} editInfo={mockEditInfo} />);
      expect(mockStorageClassSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          storageClassName: 'deployed-storage-class',
        }),
        expect.anything(),
      );
    });
  });

  describe('PVC Size Management', () => {
    it('passes correct PVC size props to NIMPVCSizeSection', () => {
      const mockSetPvcSize = jest.fn();
      mockUseNIMPVC.mockReturnValue({
        ...defaultMockNIMPVC,
        setPvcSize: mockSetPvcSize,
      });
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      expect(screen.getByTestId('nim-pvc-size-section')).toBeInTheDocument();
    });

    it('updates PVC size when editing with existing PVC', () => {
      const mockPVC = {
        metadata: { name: 'test-pvc' },
        spec: {
          resources: { requests: { storage: '100Gi' } },
        },
      };
      mockUseNIMPVC.mockReturnValue({
        ...defaultMockNIMPVC,
        pvc: mockPVC,
        pvcSize: '100Gi',
      });
      render(<ManageNIMServingModal onClose={mockOnClose} editInfo={mockEditInfo} />);
      expect(screen.getByTestId('nim-pvc-size-section')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('disables submit button when form is invalid', () => {
      mockUseCreateInferenceServiceObject.mockReturnValue([
        {
          ...defaultMockInferenceServiceData,
          name: '', // Invalid: empty name
        },
        jest.fn(),
        jest.fn(),
      ]);
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      expect(screen.getByTestId('modal-footer')).toBeInTheDocument();
    });

    it('enables submit button when form is valid', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      expect(screen.getByTestId('modal-footer')).toBeInTheDocument();
    });
  });

  describe('Modal Actions', () => {
    it('calls onClose when modal is closed', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledWith(false);
    });

    it('handles form submission', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      expect(screen.getByTestId('modal-footer')).toBeInTheDocument();
    });
  });

  describe('Project Context', () => {
    it('displays project name from project context', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);
      expect(screen.getByTestId('project-section')).toBeInTheDocument();
    });

    it('displays project name from edit info when no project context', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} editInfo={mockEditInfo} />);
      expect(screen.getByTestId('project-section')).toBeInTheDocument();
    });
  });

  describe('Authentication', () => {
    it('shows NoAuthAlert when auth is not available and not raw deployment', () => {
      const { useIsAreaAvailable } = require('#~/concepts/areas');
      useIsAreaAvailable.mockReturnValue({ status: false });

      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);

      expect(screen.getByTestId('no-auth-alert')).toBeInTheDocument();
    });

    it('does not show NoAuthAlert when auth is available', () => {
      const { useIsAreaAvailable } = require('#~/concepts/areas');
      useIsAreaAvailable.mockReturnValue({ status: true });

      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);

      expect(screen.queryByTestId('no-auth-alert')).not.toBeInTheDocument();
    });
  });

  describe('Deployment Mode', () => {
    it('shows deployment mode dropdown when both raw and serverless are available', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);

      expect(screen.getByTestId('deployment-mode-dropdown')).toBeInTheDocument();
    });

    it('disables deployment mode dropdown when editing', () => {
      render(<ManageNIMServingModal onClose={mockOnClose} editInfo={mockEditInfo} />);

      expect(screen.getByTestId('deployment-mode-dropdown')).toBeInTheDocument();
    });
  });
});

describe('ManageNIMServingModal - Storage Class Fallback Logic', () => {
  const mockOnClose = jest.fn();
  const mockProjectContext = {
    currentProject: {
      metadata: {
        name: 'test-project',
      },
    } as ProjectKind,
  };

  const mockServingRuntime: ServingRuntimeKind = {
    apiVersion: 'serving.kserve.io/v1beta1',
    kind: 'ServingRuntime',
    metadata: {
      name: 'test-serving-runtime',
      namespace: 'test-namespace',
    },
    spec: {
      containers: [],
    },
  };

  const mockEditInfo = {
    servingRuntimeEditInfo: {
      servingRuntime: mockServingRuntime,
      secrets: [] as SecretKind[],
    } as ServingRuntimeEditInfo,
    inferenceServiceEditInfo: {
      apiVersion: 'serving.kserve.io/v1beta1',
      kind: 'InferenceService',
      metadata: {
        name: 'test-inference-service',
        namespace: 'test-namespace',
      },
      spec: {
        predictor: {
          model: {
            modelFormat: {
              name: 'test-format',
            },
          },
        },
      },
    } as InferenceServiceKind,
  };

  const defaultMockInferenceServiceData = {
    name: 'test-model',
    project: 'test-project',
    k8sName: 'test-model',
    isKServeRawDeployment: false,
    format: { name: 'test-model-format' },
  };

  const defaultMockServingRuntimeData = {
    numReplicas: 1,
    imageName: 'test-image',
  };

  const defaultMockPodSpecOptionsState = {
    modelSize: {
      setSelectedSize: jest.fn(),
      sizes: [
        {
          name: 'Custom',
          resources: {
            limits: { cpu: '16', memory: '64Gi' },
            requests: { cpu: '8', memory: '32Gi' },
          },
        },
      ],
    },
    podSpecOptions: {
      resources: {
        limits: { cpu: '16', memory: '64Gi' },
        requests: { cpu: '8', memory: '32Gi' },
      },
    },
    hardwareProfile: {
      isFormDataValid: true,
      resetFormData: jest.fn(),
    },
    acceleratorProfile: {
      resetFormData: jest.fn(),
    },
  };

  const defaultMockNIMPVC = {
    pvcSize: '30Gi',
    setPvcSize: jest.fn(),
    pvc: undefined,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockUseCreateInferenceServiceObject.mockReturnValue([
      defaultMockInferenceServiceData,
      jest.fn(),
      jest.fn(),
    ]);

    mockUseCreateServingRuntimeObject.mockReturnValue([
      defaultMockServingRuntimeData,
      jest.fn(),
      jest.fn(),
    ]);

    mockUseNIMPVC.mockReturnValue(defaultMockNIMPVC);
    mockUseModelServingPodSpecOptionsState.mockReturnValue(defaultMockPodSpecOptionsState);

    // Setup default storage class mocks with correct FetchState format
    mockUseDefaultStorageClass.mockReturnValue([mockStorageClasses[0], true, null, jest.fn()]);
    mockUseGetStorageClassConfig.mockReturnValue({
      storageClasses: [mockStorageClasses[0], mockStorageClasses[1]],
      storageClassesLoaded: true,
      selectedStorageClassConfig: mockStorageClasses[0],
    });
  });

  describe('Storage Class Default Selection Logic', () => {
    it('prefers ODH default over OpenShift default', () => {
      // Mock ODH default available
      mockUseDefaultStorageClass.mockReturnValue([
        mockStorageClasses[0],
        true,
        null,
        jest.fn(),
      ]);

      mockUseGetStorageClassConfig.mockReturnValue({
        storageClasses: [mockStorageClasses[0], mockStorageClasses[1]],
        storageClassesLoaded: true,
        selectedStorageClassConfig: undefined,
      });

      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);

      expect(mockStorageClassSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          storageClassName: 'openshift-default-sc', // Should use ODH default
        }),
        expect.anything(),
      );
    });

    it('falls back to OpenShift default when no ODH default is available', () => {
      // Mock no ODH default, but OpenShift default available
      mockUseDefaultStorageClass.mockReturnValue([null, true, null, jest.fn()]);

      mockUseGetStorageClassConfig.mockReturnValue({
        storageClasses: [mockStorageClasses[0]],
        storageClassesLoaded: true,
        selectedStorageClassConfig: undefined,
      });

      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);

      expect(mockStorageClassSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          storageClassName: 'openshift-default-sc', // Should fall back to OpenShift default
        }),
        expect.anything(),
      );
    });
  });

  describe('Storage Class Configuration Display', () => {
    it('shows disabled select when no ODH storage class configs exist', async () => {
      const { useIsAreaAvailable } = require('#~/concepts/areas');
      useIsAreaAvailable.mockReturnValue({ status: true });
      // Mock no ODH configs but OpenShift default available
      mockUseDefaultStorageClass.mockReturnValue([null, true, null, jest.fn()]);

      // Create a storage class with no ODH config annotation
      const noConfigStorageClass = {
        ...mockStorageClasses[0],
        metadata: {
          ...mockStorageClasses[0].metadata,
          annotations: {},
        },
      };

      mockUseGetStorageClassConfig.mockReturnValue({
        storageClasses: [noConfigStorageClass],
        storageClassesLoaded: true,
      });

      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);

      await waitFor(() => {
        expect(screen.getByTestId('storage-class-select')).toBeInTheDocument();
      });

      const select = screen.getByTestId('storage-class-select');
      expect(select).toHaveAttribute('data-disabled', 'true');
    });

    it('shows enabled select when ODH storage class configs exist', () => {
      // Mock ODH configs available
      mockUseDefaultStorageClass.mockReturnValue([
        mockStorageClasses[0],
        true,
        null,
        jest.fn(),
      ]);

      mockUseGetStorageClassConfig.mockReturnValue({
        storageClasses: [mockStorageClasses[0], mockStorageClasses[1]],
        storageClassesLoaded: true,
        selectedStorageClassConfig: { isEnabled: true, isDefault: true },
      });

      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);

      expect(mockStorageClassSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          disableStorageClassSelect: false, // Should be enabled when ODH configs exist
          showDefaultWhenNoConfig: true, // Should still show default when no config
        }),
        expect.anything(),
      );
    });
  });

  describe('Storage Class Selection in Edit Mode', () => {
    it('uses deployed storage class when editing with existing PVC', () => {
      const mockPVC = {
        metadata: { name: 'test-pvc' },
        spec: {
          storageClassName: 'deployed-storage-class',
          resources: { requests: { storage: '50Gi' } },
        },
      };

      mockUseNIMPVC.mockReturnValue({
        ...defaultMockNIMPVC,
        pvc: mockPVC,
        pvcSize: '50Gi',
      });

      // Mock defaults available
      mockUseDefaultStorageClass.mockReturnValue([
        mockStorageClasses[0],
        true,
        null,
        jest.fn(),
      ]);

      mockUseGetStorageClassConfig.mockReturnValue({
        storageClasses: [mockStorageClasses[0], mockStorageClasses[1]],
        storageClassesLoaded: true,
        selectedStorageClassConfig: undefined,
      });

      render(<ManageNIMServingModal onClose={mockOnClose} editInfo={mockEditInfo} />);

      expect(mockStorageClassSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          storageClassName: 'deployed-storage-class', // Should use deployed storage class
          disableStorageClassSelect: true, // Should be disabled in edit mode
        }),
        expect.anything(),
      );
    });

    it('updates storage class when PVC storage class changes', () => {
      const mockPVC = {
        metadata: { name: 'test-pvc' },
        spec: {
          storageClassName: 'updated-storage-class',
          resources: { requests: { storage: '100Gi' } },
        },
      };

      mockUseNIMPVC.mockReturnValue({
        ...defaultMockNIMPVC,
        pvc: mockPVC,
        pvcSize: '100Gi',
      });

      // Mock defaults available
      mockUseDefaultStorageClass.mockReturnValue([
        mockStorageClasses[0],
        true,
        null,
        jest.fn(),
      ]);

      mockUseGetStorageClassConfig.mockReturnValue({
        storageClasses: [mockStorageClasses[0], mockStorageClasses[1]],
        storageClassesLoaded: true,
        selectedStorageClassConfig: undefined,
      });

      render(<ManageNIMServingModal onClose={mockOnClose} editInfo={mockEditInfo} />);

      expect(mockStorageClassSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          storageClassName: 'updated-storage-class', // Should use updated storage class
        }),
        expect.anything(),
      );
    });
  });

  describe('Storage Class Loading States', () => {
    it('does not render storage class select when storage classes are not available', () => {
      const { useIsAreaAvailable } = require('#~/concepts/areas');
      useIsAreaAvailable.mockReturnValue({ status: false }); // Storage classes not available

      mockUseGetStorageClassConfig.mockReturnValue({
        storageClasses: [],
        storageClassesLoaded: true,
        selectedStorageClassConfig: undefined,
      });

      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);

      expect(screen.queryByTestId('storage-class-select')).not.toBeInTheDocument();
    });

    it('renders storage class select when storage classes are available', () => {
      const { useIsAreaAvailable } = require('#~/concepts/areas');
      useIsAreaAvailable.mockReturnValue({ status: true }); // Storage classes available

      mockUseDefaultStorageClass.mockReturnValue([
        mockStorageClasses[0],
        true,
        null,
        jest.fn(),
      ]);

      mockUseGetStorageClassConfig.mockReturnValue({
        storageClasses: [mockStorageClasses[0], mockStorageClasses[1]],
        storageClassesLoaded: true,
        selectedStorageClassConfig: undefined,
      });

      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);

      expect(screen.getByTestId('storage-class-select')).toBeInTheDocument();
    });

    it('renders storage class skeleton when storage classes are available but not loaded', () => {
      const { useIsAreaAvailable } = require('#~/concepts/areas');
      useIsAreaAvailable.mockReturnValue({ status: true }); // Storage classes available

      mockUseDefaultStorageClass.mockReturnValue([
        mockStorageClasses[0],
        true,
        null,
        jest.fn(),
      ]);

      mockUseGetStorageClassConfig.mockReturnValue({
        storageClasses: [mockStorageClasses[0], mockStorageClasses[1]],
        storageClassesLoaded: false, // Not loaded yet, but available
        selectedStorageClassConfig: undefined,
      });

      render(<ManageNIMServingModal onClose={mockOnClose} projectContext={mockProjectContext} />);

      expect(screen.getByTestId('storage-class-skeleton')).toBeInTheDocument();
    });
  });
});
