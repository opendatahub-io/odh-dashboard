import { renderHook } from '@testing-library/react';
import { ModelServingPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import useModelServerSizeValidation from '#~/pages/modelServing/screens/projects/useModelServerSizeValidation';

// Mock the useValidation hook
jest.mock('#~/utilities/useValidation', () => ({
  useValidation: jest.fn(),
}));

const mockUseValidation = jest.mocked(require('#~/utilities/useValidation').useValidation);

describe('useModelServerSizeValidation', () => {
  const createMockPodSpecOptionsState = (
    overrides: Partial<ModelServingPodSpecOptionsState> = {},
  ): ModelServingPodSpecOptionsState => ({
    modelSize: {
      selectedSize: {
        name: 'Small',
        resources: {
          requests: { cpu: '1', memory: '2Gi' },
          limits: { cpu: '2', memory: '4Gi' },
        },
      },
      setSelectedSize: jest.fn(),
      sizes: [],
    },
    acceleratorProfile: {
      formData: {
        profile: undefined,
        count: 0,
        useExistingSettings: false,
      },
      setFormData: jest.fn(),
      loaded: true,
      loadError: undefined,
      initialState: {
        acceleratorProfiles: [],
        acceleratorProfile: undefined,
        count: 0,
        unknownProfileDetected: false,
      },
      resetFormData: jest.fn(),
      refresh: jest.fn(),
    },
    hardwareProfile: {
      formData: {
        selectedProfile: undefined,
        useExistingSettings: false,
      },
      setFormData: jest.fn(),
      initialHardwareProfile: undefined,
      isFormDataValid: true,
      resetFormData: jest.fn(),
      profilesLoaded: true,
      profilesLoadError: undefined,
    },
    podSpecOptions: {
      resources: {
        requests: { cpu: '1', memory: '2Gi' },
        limits: { cpu: '2', memory: '4Gi' },
      },
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return valid when there are no validation issues', () => {
    mockUseValidation.mockReturnValue({
      validationResult: { success: true },
      getAllValidationIssues: jest.fn().mockReturnValue([]),
      getValidationIssue: jest.fn(),
      hasValidationIssue: jest.fn(),
    });

    const mockState = createMockPodSpecOptionsState();
    const { result } = renderHook(() => useModelServerSizeValidation(mockState));

    expect(result.current.isValid).toBe(true);
  });

  it('should return invalid when there are validation issues', () => {
    const mockValidationIssues = [
      {
        code: 'custom',
        path: ['resources', 'requests', 'cpu'],
        message: 'Invalid CPU value',
      },
    ];

    mockUseValidation.mockReturnValue({
      validationResult: { success: false, error: { issues: mockValidationIssues } },
      getAllValidationIssues: jest.fn().mockReturnValue(mockValidationIssues),
      getValidationIssue: jest.fn(),
      hasValidationIssue: jest.fn(),
    });

    const mockState = createMockPodSpecOptionsState();
    const { result } = renderHook(() => useModelServerSizeValidation(mockState));

    expect(result.current.isValid).toBe(false);
  });

  it('should validate the selected model size', () => {
    const mockState = createMockPodSpecOptionsState();

    mockUseValidation.mockReturnValue({
      validationResult: { success: true },
      getAllValidationIssues: jest.fn().mockReturnValue([]),
      getValidationIssue: jest.fn(),
      hasValidationIssue: jest.fn(),
    });

    renderHook(() => useModelServerSizeValidation(mockState));

    expect(mockUseValidation).toHaveBeenCalledWith(
      mockState.modelSize.selectedSize,
      expect.any(Object), // modelServingSizeSchema
    );
  });

  it('should handle empty validation issues object', () => {
    mockUseValidation.mockReturnValue({
      validationResult: { success: true },
      getAllValidationIssues: jest.fn().mockReturnValue({}),
      getValidationIssue: jest.fn(),
      hasValidationIssue: jest.fn(),
    });

    const mockState = createMockPodSpecOptionsState();
    const { result } = renderHook(() => useModelServerSizeValidation(mockState));

    expect(result.current.isValid).toBe(true);
  });

  it('should handle validation issues with multiple errors', () => {
    const mockValidationIssues = [
      {
        code: 'custom',
        path: ['resources', 'requests', 'cpu'],
        message: 'Invalid CPU value',
      },
      {
        code: 'custom',
        path: ['resources', 'requests', 'memory'],
        message: 'Invalid memory value',
      },
    ];

    mockUseValidation.mockReturnValue({
      validationResult: { success: false, error: { issues: mockValidationIssues } },
      getAllValidationIssues: jest.fn().mockReturnValue(mockValidationIssues),
      getValidationIssue: jest.fn(),
      hasValidationIssue: jest.fn(),
    });

    const mockState = createMockPodSpecOptionsState();
    const { result } = renderHook(() => useModelServerSizeValidation(mockState));

    expect(result.current.isValid).toBe(false);
  });

  it('should update validation when model size changes', () => {
    const mockState = createMockPodSpecOptionsState();

    mockUseValidation.mockReturnValue({
      validationResult: { success: true },
      getAllValidationIssues: jest.fn().mockReturnValue([]),
      getValidationIssue: jest.fn(),
      hasValidationIssue: jest.fn(),
    });

    const { rerender } = renderHook(({ state }) => useModelServerSizeValidation(state), {
      initialProps: { state: mockState },
    });

    // Update the model size
    const updatedState = createMockPodSpecOptionsState({
      modelSize: {
        ...mockState.modelSize,
        selectedSize: {
          name: 'Large',
          resources: {
            requests: { cpu: '2', memory: '4Gi' },
            limits: { cpu: '4', memory: '8Gi' },
          },
        },
      },
    });

    rerender({ state: updatedState });

    expect(mockUseValidation).toHaveBeenCalledWith(
      updatedState.modelSize.selectedSize,
      expect.any(Object),
    );
  });
});
