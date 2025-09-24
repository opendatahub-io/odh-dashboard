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
    it('should validate saveAsAAA', () => {
      const result = availableAiAssetsFieldsSchema.safeParse({ saveAsAAA: true });
      expect(result.success).toBe(true);
    });
  });
  describe('isValidAvailableAiAssetsFieldsData', () => {
    // Always returns true since all the fields are optional
    it('should return true if saveAsAAA is false', () => {
      const result = isValidAvailableAiAssetsFieldsData();
      expect(result).toBe(true);
    });
    it('should return true if saveAsAAA is true and useCase is provided', () => {
      const result = isValidAvailableAiAssetsFieldsData();
      expect(result).toBe(true);
    });
    it('should return true if saveAsAAA is true and useCase is not provided', () => {
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
      expect(result.current.data).toStrictEqual({ saveAsAAA: false, useCase: '', description: '' });
    });
    it('should initialize with existing data', () => {
      const { result } = renderHook(() =>
        useAvailableAiAssetsFields({ saveAsAAA: true, useCase: 'test' }),
      );
      expect(result.current.data).toStrictEqual({ saveAsAAA: true, useCase: 'test' });
    });
    it('should update data', () => {
      const { result } = renderHook(() => useAvailableAiAssetsFields());
      act(() => {
        result.current.setData({ saveAsAAA: true, useCase: 'test' });
      });
      expect(result.current.data).toStrictEqual({ saveAsAAA: true, useCase: 'test' });
    });
  });
  describe('AvailableAiAssetsFieldsComponent', () => {
    it('should render with default props', () => {
      render(
        <AvailableAiAssetsFieldsComponent
          data={{ saveAsAAA: false, useCase: '', description: '' }}
          setData={jest.fn()}
          wizardData={mockDeploymentWizardState()}
        />,
      );
      expect(screen.getByTestId('save-as-aaa-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('save-as-aaa-checkbox')).not.toBeChecked();
    });
    it('should render with saveAsAAA true', () => {
      render(
        <AvailableAiAssetsFieldsComponent
          data={{ saveAsAAA: true, useCase: '', description: '' }}
          setData={jest.fn()}
          wizardData={mockDeploymentWizardState()}
        />,
      );
      expect(screen.getByTestId('save-as-aaa-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('save-as-aaa-checkbox')).toBeChecked();
    });
    it('should render with useCase input', () => {
      render(
        <AvailableAiAssetsFieldsComponent
          data={{ saveAsAAA: true, useCase: 'test', description: '' }}
          setData={jest.fn()}
          wizardData={mockDeploymentWizardState()}
        />,
      );
      expect(screen.getByTestId('save-as-aaa-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('save-as-aaa-checkbox')).toBeChecked();
      expect(screen.getByTestId('use-case-input')).toBeInTheDocument();
      expect(screen.getByTestId('use-case-input')).toHaveValue('test');
    });
    it('should not show the save as AAA checkbox if the model type is not generative', () => {
      render(
        <AvailableAiAssetsFieldsComponent
          data={{ saveAsAAA: false, useCase: '', description: '' }}
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
      expect(screen.queryByTestId('save-as-aaa-checkbox')).not.toBeInTheDocument();
      expect(screen.queryByTestId('use-case-input')).not.toBeInTheDocument();
    });
  });
});
