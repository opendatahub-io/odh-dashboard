import * as React from 'react';
import { renderHook } from '@testing-library/react';
import { useModelDeploymentDetection } from '../deploymentUtils';
import { useDeploymentsState } from '../../hooks/useDeploymentsState';
import { KnownLabels } from '../../k8sTypes';
import { ModelVersion } from '~/app/types';
import { mockModelVersion } from '~/__mocks__/mockModelVersion';

// Mock the useDeploymentsState hook
jest.mock('../../hooks/useDeploymentsState');
const mockUseDeploymentsState = useDeploymentsState as jest.MockedFunction<typeof useDeploymentsState>;

// Mock deployment objects
const createMockDeployment = (modelVersionId: string, kind: string = 'InferenceService') => ({
  model: {
    kind,
    metadata: {
      labels: {
        [KnownLabels.MODEL_VERSION_ID]: modelVersionId,
      },
    },
  },
});

// Mock model versions
const mockModelVersions: ModelVersion[] = [
  mockModelVersion({ id: 'mv-1', registeredModelId: 'rm-1' }),
  mockModelVersion({ id: 'mv-2', registeredModelId: 'rm-1' }),
  mockModelVersion({ id: 'mv-3', registeredModelId: 'rm-2' }),
];

describe('useModelDeploymentDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading States (Conservative Approach)', () => {
    it('should return hasDeployment: true when deployments are not loaded (prevents flicker)', () => {
      mockUseDeploymentsState.mockReturnValue({
        deployments: undefined,
        loaded: false,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const modelVersionResult = result.current.hasModelVersionDeployment('mv-1');
      expect(modelVersionResult).toEqual({ hasDeployment: true, loaded: false });
      
      const registeredModelResult = result.current.hasRegisteredModelDeployment('rm-1', mockModelVersions);
      expect(registeredModelResult).toEqual({ hasDeployment: true, loaded: false });
      
      const versionIdsResult = result.current.hasRegisteredModelDeploymentByVersionIds(['mv-1', 'mv-2']);
      expect(versionIdsResult).toEqual({ hasDeployment: true, loaded: false });
    });

    it('should return hasDeployment: true when deployments array is empty but not loaded', () => {
      mockUseDeploymentsState.mockReturnValue({
        deployments: [],
        loaded: false,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const modelVersionResult = result.current.hasModelVersionDeployment('mv-1');
      expect(modelVersionResult).toEqual({ hasDeployment: true, loaded: false });
    });
  });

  describe('hasModelVersionDeployment', () => {
    it('should return false when no deployments exist for the model version', () => {
      mockUseDeploymentsState.mockReturnValue({
        deployments: [],
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const modelVersionResult = result.current.hasModelVersionDeployment('mv-1');
      expect(modelVersionResult).toEqual({ hasDeployment: false, loaded: true });
    });

    it('should return false when deployments exist but none match the model version ID', () => {
      const deployments = [
        createMockDeployment('mv-other'),
        createMockDeployment('mv-different'),
      ];

      mockUseDeploymentsState.mockReturnValue({
        deployments,
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const modelVersionResult = result.current.hasModelVersionDeployment('mv-1');
      expect(modelVersionResult).toEqual({ hasDeployment: false, loaded: true });
    });

    it('should return true when a deployment exists for the model version', () => {
      const deployments = [
        createMockDeployment('mv-other'),
        createMockDeployment('mv-1'), // This should match
        createMockDeployment('mv-different'),
      ];

      mockUseDeploymentsState.mockReturnValue({
        deployments,
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const modelVersionResult = result.current.hasModelVersionDeployment('mv-1');
      expect(modelVersionResult).toEqual({ hasDeployment: true, loaded: true });
    });

    it('should only consider InferenceService deployments', () => {
      const deployments = [
        createMockDeployment('mv-1', 'Deployment'), // Not InferenceService
        createMockDeployment('mv-1', 'Pod'), // Not InferenceService
      ];

      mockUseDeploymentsState.mockReturnValue({
        deployments,
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const modelVersionResult = result.current.hasModelVersionDeployment('mv-1');
      expect(modelVersionResult).toEqual({ hasDeployment: false, loaded: true });
    });

    it('should handle deployments without labels gracefully', () => {
      const deployments = [
        {
          model: {
            kind: 'InferenceService',
            metadata: {
              // No labels
            },
          },
        },
        {
          model: {
            kind: 'InferenceService',
            metadata: {
              labels: {}, // Empty labels
            },
          },
        },
      ];

      mockUseDeploymentsState.mockReturnValue({
        deployments,
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const modelVersionResult = result.current.hasModelVersionDeployment('mv-1');
      expect(modelVersionResult).toEqual({ hasDeployment: false, loaded: true });
    });
  });

  describe('hasRegisteredModelDeployment', () => {
    it('should return false when no model versions exist for the registered model', () => {
      mockUseDeploymentsState.mockReturnValue({
        deployments: [createMockDeployment('mv-1')],
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const registeredModelResult = result.current.hasRegisteredModelDeployment('rm-nonexistent', mockModelVersions);
      expect(registeredModelResult).toEqual({ hasDeployment: false, loaded: true });
    });

    it('should return false when no deployments exist for any model version of the registered model', () => {
      const deployments = [
        createMockDeployment('mv-other'),
      ];

      mockUseDeploymentsState.mockReturnValue({
        deployments,
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const registeredModelResult = result.current.hasRegisteredModelDeployment('rm-1', mockModelVersions);
      expect(registeredModelResult).toEqual({ hasDeployment: false, loaded: true });
    });

    it('should return true when any model version of the registered model is deployed', () => {
      const deployments = [
        createMockDeployment('mv-other'),
        createMockDeployment('mv-2'), // mv-2 belongs to rm-1
      ];

      mockUseDeploymentsState.mockReturnValue({
        deployments,
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const registeredModelResult = result.current.hasRegisteredModelDeployment('rm-1', mockModelVersions);
      expect(registeredModelResult).toEqual({ hasDeployment: true, loaded: true });
    });

    it('should return true when multiple model versions of the registered model are deployed', () => {
      const deployments = [
        createMockDeployment('mv-1'), // mv-1 belongs to rm-1
        createMockDeployment('mv-2'), // mv-2 belongs to rm-1
      ];

      mockUseDeploymentsState.mockReturnValue({
        deployments,
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const registeredModelResult = result.current.hasRegisteredModelDeployment('rm-1', mockModelVersions);
      expect(registeredModelResult).toEqual({ hasDeployment: true, loaded: true });
    });
  });

  describe('hasRegisteredModelDeploymentByVersionIds', () => {
    it('should return false when no version IDs are provided', () => {
      mockUseDeploymentsState.mockReturnValue({
        deployments: [createMockDeployment('mv-1')],
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const versionIdsResult = result.current.hasRegisteredModelDeploymentByVersionIds([]);
      expect(versionIdsResult).toEqual({ hasDeployment: false, loaded: true });
    });

    it('should return false when no deployments match the provided version IDs', () => {
      const deployments = [
        createMockDeployment('mv-other'),
      ];

      mockUseDeploymentsState.mockReturnValue({
        deployments,
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const versionIdsResult = result.current.hasRegisteredModelDeploymentByVersionIds(['mv-1', 'mv-2']);
      expect(versionIdsResult).toEqual({ hasDeployment: false, loaded: true });
    });

    it('should return true when any of the provided version IDs has a deployment', () => {
      const deployments = [
        createMockDeployment('mv-other'),
        createMockDeployment('mv-2'), // This should match
      ];

      mockUseDeploymentsState.mockReturnValue({
        deployments,
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      const versionIdsResult = result.current.hasRegisteredModelDeploymentByVersionIds(['mv-1', 'mv-2', 'mv-3']);
      expect(versionIdsResult).toEqual({ hasDeployment: true, loaded: true });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle real-world scenario: loaded state with mixed deployments', () => {
      const deployments = [
        createMockDeployment('mv-1'), // InferenceService for mv-1
        createMockDeployment('mv-4', 'Deployment'), // Not InferenceService
        {
          model: {
            kind: 'InferenceService',
            metadata: {
              labels: {
                'other-label': 'value', // No MODEL_VERSION_ID label
              },
            },
          },
        },
        createMockDeployment('mv-3'), // InferenceService for mv-3
      ];

      mockUseDeploymentsState.mockReturnValue({
        deployments,
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      // Test individual model version detection
      expect(result.current.hasModelVersionDeployment('mv-1')).toEqual({ hasDeployment: true, loaded: true });
      expect(result.current.hasModelVersionDeployment('mv-2')).toEqual({ hasDeployment: false, loaded: true });
      expect(result.current.hasModelVersionDeployment('mv-3')).toEqual({ hasDeployment: true, loaded: true });
      expect(result.current.hasModelVersionDeployment('mv-4')).toEqual({ hasDeployment: false, loaded: true }); // Not InferenceService
      
      // Test registered model detection (rm-1 has mv-1 and mv-2)
      expect(result.current.hasRegisteredModelDeployment('rm-1', mockModelVersions)).toEqual({ hasDeployment: true, loaded: true }); // mv-1 is deployed
      expect(result.current.hasRegisteredModelDeployment('rm-2', mockModelVersions)).toEqual({ hasDeployment: true, loaded: true }); // mv-3 is deployed
      
      // Test version IDs detection
      expect(result.current.hasRegisteredModelDeploymentByVersionIds(['mv-1', 'mv-2'])).toEqual({ hasDeployment: true, loaded: true }); // mv-1 is deployed
      expect(result.current.hasRegisteredModelDeploymentByVersionIds(['mv-2', 'mv-4'])).toEqual({ hasDeployment: false, loaded: true }); // Neither deployed
    });

    it('should maintain referential stability with memoization', () => {
      mockUseDeploymentsState.mockReturnValue({
        deployments: [createMockDeployment('mv-1')],
        loaded: true,
      });

      const { result, rerender } = renderHook(() => useModelDeploymentDetection());
      
      const firstRender = {
        hasModelVersionDeployment: result.current.hasModelVersionDeployment,
        hasRegisteredModelDeployment: result.current.hasRegisteredModelDeployment,
        hasRegisteredModelDeploymentByVersionIds: result.current.hasRegisteredModelDeploymentByVersionIds,
      };
      
      // Rerender with same data
      rerender();
      
      // Functions should be the same reference (memoized)
      expect(result.current.hasModelVersionDeployment).toBe(firstRender.hasModelVersionDeployment);
      expect(result.current.hasRegisteredModelDeployment).toBe(firstRender.hasRegisteredModelDeployment);
      expect(result.current.hasRegisteredModelDeploymentByVersionIds).toBe(firstRender.hasRegisteredModelDeploymentByVersionIds);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined model version ID gracefully', () => {
      mockUseDeploymentsState.mockReturnValue({
        deployments: [createMockDeployment('mv-1')],
        loaded: true,
      });

      const { result } = renderHook(() => useModelDeploymentDetection());
      
      // These should not throw and should return false
      expect(result.current.hasModelVersionDeployment('')).toEqual({ hasDeployment: false, loaded: true });
    });
  });
});