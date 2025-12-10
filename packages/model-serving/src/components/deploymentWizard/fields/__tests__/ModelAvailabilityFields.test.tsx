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

jest.mock('@odh-dashboard/plugin-core');

describe('AvailableAiAssetsFields', () => {
  beforeEach(() => {
    mockExtensions([]);
  });

  describe('Schema validation', () => {
    it('should validate model availability data', () => {
      const result = modelAvailabilityFieldsSchema.safeParse({ saveAsMaaS: true, useCase: 'test' });
      expect(result.success).toBe(true);
    });
  });
  describe('isValidAvailableAiAssetsFieldsData', () => {
    // Always returns true since all the fields are optional
    it('should return true for valid data', () => {
      const result = isValidModelAvailabilityFieldsData();
      expect(result).toBe(true);
    });
  });
  describe('useAvailableAiAssetsFields', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useModelAvailabilityFields());
      expect(result.current.data).toStrictEqual({
        saveAsMaaS: undefined,
        useCase: '',
      });
    });
    it('should initialize with existing data', () => {
      const { result } = renderHook(() =>
        useModelAvailabilityFields({ saveAsMaaS: true, useCase: 'test' }),
      );
      expect(result.current.data).toStrictEqual({
        saveAsMaaS: true,
        useCase: 'test',
      });
    });
    it('should update data', () => {
      const { result } = renderHook(() => useModelAvailabilityFields());
      act(() => {
        result.current.setData({ saveAsMaaS: true, useCase: 'test' });
      });
      expect(result.current.data).toStrictEqual({
        saveAsMaaS: true,
        useCase: 'test',
      });
    });
  });
  describe('AvailableAiAssetsFieldsComponent', () => {
    it('should show MaaS checkbox when showSaveAsMaaS is true', () => {
      render(
        <AvailableAiAssetsFieldsComponent
          data={{ saveAsMaaS: true, useCase: '' }}
          setData={jest.fn()}
          showSaveAsMaaS
        />,
      );
      expect(screen.getByTestId('save-as-maas-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('save-as-maas-checkbox')).toBeChecked();
    });
    it('should render use case input when MaaS is checked', () => {
      render(
        <AvailableAiAssetsFieldsComponent
          data={{ saveAsMaaS: true, useCase: 'test' }}
          setData={jest.fn()}
          showSaveAsMaaS
        />,
      );
      expect(screen.getByTestId('save-as-maas-checkbox')).toBeInTheDocument();
      expect(screen.getByTestId('use-case-input')).toBeInTheDocument();
      expect(screen.getByTestId('use-case-input')).toHaveValue('test');
    });
  });
  describe('useModelAvailabilityFields hook visibility logic', () => {
    it('should show field when model type is generative', () => {
      const { result } = renderHook(() =>
        useModelAvailabilityFields(undefined, ServingRuntimeModelType.GENERATIVE),
      );
      expect(result.current.showField).toBe(true);
    });
    it('should not show field when model type is predictive', () => {
      const { result } = renderHook(() =>
        useModelAvailabilityFields(undefined, ServingRuntimeModelType.PREDICTIVE),
      );
      expect(result.current.showField).toBe(false);
    });
    it('should reset data when model type changes from generative to not generative', () => {
      const { result, rerender } = renderHook(
        ({ modelType }) =>
          useModelAvailabilityFields({ saveAsMaaS: true, useCase: 'test' }, modelType),
        { initialProps: { modelType: ServingRuntimeModelType.GENERATIVE } },
      );

      // Initially with generative model, data should be preserved
      expect(result.current.data).toStrictEqual({
        saveAsMaaS: true,
        useCase: 'test',
      });
      expect(result.current.showField).toBe(true);

      // Change to predictive model type
      rerender({ modelType: ServingRuntimeModelType.PREDICTIVE });

      // Data should be reset and field should be hidden
      expect(result.current.data).toStrictEqual({
        saveAsMaaS: undefined,
        useCase: '',
      });
      expect(result.current.showField).toBe(false);
    });
  });
});
