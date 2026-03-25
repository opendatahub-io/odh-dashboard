import React, { act } from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import {
  modelAvailabilityFieldsSchema,
  AvailableAiAssetsFieldsComponent,
  isValidModelAvailabilityFieldsData,
  useModelAvailabilityFields,
} from '../ModelAvailabilityFields';
import { mockExtensions } from '../../../../__tests__/mockUtils';
import type { UseModelDeploymentWizardState } from '../../useDeploymentWizard';

jest.mock('@odh-dashboard/plugin-core');

const mockWizardState: UseModelDeploymentWizardState = {
  fields: [],
} as unknown as UseModelDeploymentWizardState;

describe('AvailableAiAssetsFields', () => {
  beforeEach(() => {
    mockExtensions([]);
  });

  describe('Schema validation', () => {
    it('should validate saveAsAiAsset', () => {
      const result = modelAvailabilityFieldsSchema.safeParse({ saveAsAiAsset: true });
      expect(result.success).toBe(true);
    });
  });
  describe('isValidAvailableAiAssetsFieldsData', () => {
    // Always returns true since all the fields are optional
    it('should return true if saveAsAiAsset is false', () => {
      const result = isValidModelAvailabilityFieldsData();
      expect(result).toBe(true);
    });
    it('should return true if saveAsAiAsset is true and useCase is provided', () => {
      const result = isValidModelAvailabilityFieldsData();
      expect(result).toBe(true);
    });
    it('should return true if saveAsAiAsset is true and useCase is not provided', () => {
      const result = isValidModelAvailabilityFieldsData();
      expect(result).toBe(true);
    });
    it('should return true if useCase and description are provided', () => {
      const result = isValidModelAvailabilityFieldsData();
      expect(result).toBe(true);
    });
    it('should return true if useCase and description are not provided', () => {
      const result = isValidModelAvailabilityFieldsData();
      expect(result).toBe(true);
    });
  });
  describe('useAvailableAiAssetsFields', () => {
    it('should initialize with false by default', () => {
      const { result } = renderHook(() => useModelAvailabilityFields());
      expect(result.current.data.saveAsAiAsset).toBe(false);
      expect(result.current.data.useCase).toBe('');
    });
    it('should initialize with existing data', () => {
      const { result } = renderHook(() =>
        useModelAvailabilityFields({ saveAsAiAsset: true, useCase: 'test' }),
      );
      expect(result.current.data.saveAsAiAsset).toBe(true);
      expect(result.current.data.useCase).toBe('test');
    });
    it('should update data', () => {
      const { result } = renderHook(() => useModelAvailabilityFields());
      act(() => {
        result.current.setData({ saveAsAiAsset: true, useCase: 'test' });
      });
      expect(result.current.data.saveAsAiAsset).toBe(true);
      expect(result.current.data.useCase).toBe('test');
    });
  });
  // RHOAIENG-37896: Component no longer renders hardcoded checkbox, only extension point
  describe('AvailableAiAssetsFieldsComponent', () => {
    it('should render container for extension-based fields', () => {
      const { container } = render(
        <AvailableAiAssetsFieldsComponent wizardState={mockWizardState} />,
      );
      // Component should render a StackItem container
      expect(container.querySelector('.pf-v6-c-stack__item')).toBeInTheDocument();
    });

    it('should render without errors when no extensions are registered', () => {
      expect(() => {
        render(<AvailableAiAssetsFieldsComponent wizardState={mockWizardState} />);
      }).not.toThrow();
    });

    // Note: Tests for AAA checkbox rendering are now in the gen-ai package
    // at packages/gen-ai/frontend/src/odh/modelServingExtensions/modelDeploymentWizard/__tests__/
  });
  describe('useModelAvailabilityFields hook visibility logic', () => {
    it('should show field when model type is generative', () => {
      const { result } = renderHook(() =>
        useModelAvailabilityFields(undefined, {
          type: ServingRuntimeModelType.GENERATIVE,
          legacyVLLM: false,
        }),
      );
      expect(result.current.showField).toBe(true);
    });
    it('should not show field when model type is predictive', () => {
      const { result } = renderHook(() =>
        useModelAvailabilityFields(undefined, {
          type: ServingRuntimeModelType.PREDICTIVE,
          legacyVLLM: false,
        }),
      );
      expect(result.current.showField).toBe(false);
    });
    it('should reset data when model type changes from generative to not generative', () => {
      const { result, rerender } = renderHook(
        ({ modelType }) =>
          useModelAvailabilityFields({ saveAsAiAsset: true, useCase: 'test' }, modelType),
        {
          initialProps: {
            modelType: { type: ServingRuntimeModelType.GENERATIVE, legacyVLLM: false },
          },
        },
      );

      // Initially with generative model, data should be preserved
      expect(result.current.data.saveAsAiAsset).toBe(true);
      expect(result.current.data.useCase).toBe('test');
      expect(result.current.showField).toBe(true);

      // Change to predictive model type
      rerender({
        modelType: { type: ServingRuntimeModelType.PREDICTIVE, legacyVLLM: false },
      });

      // Data should be reset and field should be hidden
      expect(result.current.data.saveAsAiAsset).toBe(false);
      expect(result.current.data.useCase).toBe('');
      expect(result.current.showField).toBe(false);
    });
  });
});
