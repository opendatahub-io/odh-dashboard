import React, { act } from 'react';
import { render, screen, renderHook } from '@testing-library/react';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import {
  availableAiAssetsFieldsSchema,
  AvailableAiAssetsFieldsComponent,
  isValidAvailableAiAssetsFieldsData,
  useAvailableAiAssetsFields,
} from '../AvailableAiAssetsFields';
import { mockDeploymentWizardState } from '../../../../__tests__/mockUtils';

describe('AvailableAiAssetsFields', () => {
  describe('Schema validation', () => {
    it('should validate saveAsAiAsset', () => {
      const result = availableAiAssetsFieldsSchema.safeParse({ saveAsAiAsset: true });
      expect(result.success).toBe(true);
    });
  });
  describe('isValidAvailableAiAssetsFieldsData', () => {
    // Always returns true since all the fields are optional
    it('should return true if saveAsAiAsset is false', () => {
      const result = isValidAvailableAiAssetsFieldsData();
      expect(result).toBe(true);
    });
    it('should return true if saveAsAiAsset is true and useCase is provided', () => {
      const result = isValidAvailableAiAssetsFieldsData();
      expect(result).toBe(true);
    });
    it('should return true if saveAsAiAsset is true and useCase is not provided', () => {
      const result = isValidAvailableAiAssetsFieldsData();
      expect(result).toBe(true);
    });
    it('should return true if useCase and description are provided', () => {
      const result = isValidAvailableAiAssetsFieldsData();
      expect(result).toBe(true);
    });
    it('should return true if useCase and description are not provided', () => {
      const result = isValidAvailableAiAssetsFieldsData();
      expect(result).toBe(true);
    });
  });
  describe('useAvailableAiAssetsFields', () => {
    it('should initialize with false by default', () => {
      const { result } = renderHook(() => useAvailableAiAssetsFields());
      expect(result.current.data).toStrictEqual({ saveAsAiAsset: false, useCase: '' });
    });
    it('should initialize with existing data', () => {
      const { result } = renderHook(() =>
        useAvailableAiAssetsFields({ saveAsAiAsset: true, useCase: 'test' }),
      );
      expect(result.current.data).toStrictEqual({ saveAsAiAsset: true, useCase: 'test' });
    });
    it('should update data', () => {
      const { result } = renderHook(() => useAvailableAiAssetsFields());
      act(() => {
        result.current.setData({ saveAsAiAsset: true, useCase: 'test' });
      });
      expect(result.current.data).toStrictEqual({ saveAsAiAsset: true, useCase: 'test' });
    });
  });
  describe('AvailableAiAssetsFieldsComponent', () => {
    it('should render with default props', () => {
      render(
        <AvailableAiAssetsFieldsComponent
          data={{ saveAsAiAsset: false, useCase: '' }}
          setData={jest.fn()}
          wizardData={mockDeploymentWizardState()}
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
          wizardData={mockDeploymentWizardState()}
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
          wizardData={mockDeploymentWizardState()}
        />,
      );
      expect(screen.getByTestId('save-as-ai-asset-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('save-as-ai-asset-checkbox')).toBeChecked();
      expect(screen.getByTestId('use-case-input')).toBeInTheDocument();
      expect(screen.getByTestId('use-case-input')).toHaveValue('test');
    });
    it('should not show the save as AiAsset checkbox if the model type is not generative', () => {
      render(
        <AvailableAiAssetsFieldsComponent
          data={{ saveAsAiAsset: false, useCase: '' }}
          setData={jest.fn()}
          wizardData={mockDeploymentWizardState({
            state: {
              modelType: {
                data: ServingRuntimeModelType.PREDICTIVE,
                setData: jest.fn(),
              },
            },
          })}
        />,
      );
      expect(screen.queryByTestId('save-as-ai-asset-checkbox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('use-case-input')).not.toBeInTheDocument();
    });
  });
});
