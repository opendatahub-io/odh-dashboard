import React, { act } from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import { useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas';
import type { IsAreaAvailableStatus } from '@odh-dashboard/internal/concepts/areas/types';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { mockExtensions } from '../../../../__tests__/mockUtils';
import type { UseModelDeploymentWizardState } from '../../useDeploymentWizard';
import {
  modelAvailabilityFieldsSchema,
  AvailableAiAssetsFieldsComponent,
  isValidModelAvailabilityFieldsData,
  useModelAvailabilityFields,
} from '../ModelAvailabilityFields';

jest.mock('@odh-dashboard/plugin-core');
jest.mock('@odh-dashboard/internal/concepts/areas', () => ({
  ...jest.requireActual('@odh-dashboard/internal/concepts/areas'),
  useIsAreaAvailable: jest.fn(),
}));

const mockUseIsAreaAvailable = jest.mocked(useIsAreaAvailable);

const mockAreaAvailabilityStatus = (status: boolean): IsAreaAvailableStatus => ({
  status,
  devFlags: null,
  featureFlags: null,
  reliantAreas: null,
  requiredCapabilities: null,
  requiredComponents: null,
  customCondition: () => false,
});

const mockWizardState: UseModelDeploymentWizardState = {
  fields: [],
} as unknown as UseModelDeploymentWizardState;

describe('AvailableAiAssetsFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    beforeEach(() => {
      mockUseIsAreaAvailable.mockReturnValue(mockAreaAvailabilityStatus(true));
    });

    it('should initialize with false by default', () => {
      const { result } = renderHook(() => useModelAvailabilityFields());
      expect(result.current.data.saveAsAiAsset).toBe(false);
      expect(result.current.data.useCase).toBe('');
      expect(result.current.isGenAiEnabled).toBe(true);
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
    it('should force-clear saveAsAiAsset and useCase when Gen AI is disabled', () => {
      mockUseIsAreaAvailable.mockReturnValue(mockAreaAvailabilityStatus(false));
      const { result } = renderHook(() =>
        useModelAvailabilityFields({ saveAsAiAsset: true, useCase: 'chat' }),
      );
      expect(result.current.data.saveAsAiAsset).toBe(false);
      expect(result.current.data.useCase).toBe('');
      expect(result.current.isGenAiEnabled).toBe(false);
    });
  });
  describe('AvailableAiAssetsFieldsComponent', () => {
    describe('when Gen AI Studio area is available', () => {
      beforeEach(() => {
        mockUseIsAreaAvailable.mockReturnValue(mockAreaAvailabilityStatus(true));
      });

      it('should render with default props', () => {
        render(
          <AvailableAiAssetsFieldsComponent
            data={{ saveAsAiAsset: false, useCase: '' }}
            setData={jest.fn()}
            isGenAiEnabled
            wizardState={mockWizardState}
          />,
        );
        expect(screen.getByTestId('save-as-ai-asset-checkbox')).toBeInTheDocument();
        expect(screen.getByTestId('save-as-ai-asset-checkbox')).not.toBeChecked();
      });

      it('should render with saveAsAiAsset true', () => {
        render(
          <AvailableAiAssetsFieldsComponent
            data={{ saveAsAiAsset: true, useCase: '' }}
            setData={jest.fn()}
            isGenAiEnabled
            wizardState={mockWizardState}
          />,
        );
        expect(screen.getByTestId('save-as-ai-asset-checkbox')).toBeInTheDocument();
        expect(screen.getByTestId('save-as-ai-asset-checkbox')).toBeChecked();
      });

      it('should render with useCase input', () => {
        render(
          <AvailableAiAssetsFieldsComponent
            data={{ saveAsAiAsset: true, useCase: 'test' }}
            setData={jest.fn()}
            isGenAiEnabled
            wizardState={mockWizardState}
          />,
        );
        expect(screen.getByTestId('save-as-ai-asset-checkbox')).toBeInTheDocument();
        expect(screen.getByTestId('save-as-ai-asset-checkbox')).toBeChecked();
        expect(screen.getByTestId('use-case-input')).toBeInTheDocument();
        expect(screen.getByTestId('use-case-input')).toHaveValue('test');
      });
    });

    describe('when Gen AI Studio area is NOT available', () => {
      beforeEach(() => {
        mockUseIsAreaAvailable.mockReturnValue(mockAreaAvailabilityStatus(false));
      });

      it('should not render checkbox when area is disabled', () => {
        render(
          <AvailableAiAssetsFieldsComponent
            data={{ saveAsAiAsset: false, useCase: '' }}
            setData={jest.fn()}
            isGenAiEnabled={false}
            wizardState={mockWizardState}
          />,
        );
        expect(screen.queryByTestId('save-as-ai-asset-checkbox')).not.toBeInTheDocument();
      });

      it('should not render checkbox even if saveAsAiAsset is true', () => {
        render(
          <AvailableAiAssetsFieldsComponent
            data={{ saveAsAiAsset: true, useCase: 'test' }}
            setData={jest.fn()}
            isGenAiEnabled={false}
            wizardState={mockWizardState}
          />,
        );
        expect(screen.queryByTestId('save-as-ai-asset-checkbox')).not.toBeInTheDocument();
        expect(screen.queryByTestId('use-case-input')).not.toBeInTheDocument();
      });

      it('should not render use case input when area is disabled', () => {
        render(
          <AvailableAiAssetsFieldsComponent
            data={{ saveAsAiAsset: true, useCase: 'existing data' }}
            setData={jest.fn()}
            isGenAiEnabled={false}
            wizardState={mockWizardState}
          />,
        );
        expect(screen.queryByTestId('use-case-input')).not.toBeInTheDocument();
      });
    });
  });
  describe('useModelAvailabilityFields hook visibility logic', () => {
    beforeEach(() => {
      mockUseIsAreaAvailable.mockReturnValue(mockAreaAvailabilityStatus(true));
    });

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
