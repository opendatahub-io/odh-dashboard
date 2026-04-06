import React, { act } from 'react';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { type ZodIssue } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import {
  ModelTypeSelectField,
  modelTypeSelectFieldSchema,
  useModelTypeField,
  isValidModelType,
} from '../ModelTypeSelectField';
import { ModelTypeLabel } from '../../types';

describe('ModelTypeSelectField', () => {
  describe('Schema validation', () => {
    it('should validate predictive', () => {
      const result = modelTypeSelectFieldSchema.safeParse({
        type: ServingRuntimeModelType.PREDICTIVE,
        legacyVLLM: false,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: ServingRuntimeModelType.PREDICTIVE,
        legacyVLLM: false,
      });
    });

    it('should validate generative-model', () => {
      const result = modelTypeSelectFieldSchema.safeParse({
        type: ServingRuntimeModelType.GENERATIVE,
        legacyVLLM: false,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: ServingRuntimeModelType.GENERATIVE,
        legacyVLLM: false,
      });
    });

    it('should validate generative with legacyVLLM true', () => {
      const result = modelTypeSelectFieldSchema.safeParse({
        type: ServingRuntimeModelType.GENERATIVE,
        legacyVLLM: true,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: ServingRuntimeModelType.GENERATIVE,
        legacyVLLM: true,
      });
    });

    it('should reject invalid values', () => {
      const result = modelTypeSelectFieldSchema.safeParse('invalid-model');
      expect(result.success).toBe(false);
    });

    it('should show required error for undefined', () => {
      const result = modelTypeSelectFieldSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });

  describe('isValidModelType', () => {
    it('should return true for valid model types', () => {
      expect(isValidModelType(ServingRuntimeModelType.PREDICTIVE)).toBe(true);
      expect(isValidModelType(ServingRuntimeModelType.GENERATIVE)).toBe(true);
    });

    it('should return false for invalid model types', () => {
      expect(isValidModelType('invalid')).toBe(false);
      expect(isValidModelType('')).toBe(false);
    });
  });

  describe('useModelTypeField hook', () => {
    it('should initialize with undefined by default', () => {
      const { result } = renderHook(() => useModelTypeField());
      expect(result.current.data).toBeUndefined();
    });

    it('should initialize with existing data', () => {
      const { result } = renderHook(() =>
        useModelTypeField({ type: ServingRuntimeModelType.PREDICTIVE, legacyVLLM: false }),
      );
      expect(result.current.data).toEqual({
        type: ServingRuntimeModelType.PREDICTIVE,
        legacyVLLM: false,
      });
    });

    it('should update model type', () => {
      const { result } = renderHook(() => useModelTypeField());
      act(() => {
        result.current.setData({ type: ServingRuntimeModelType.GENERATIVE, legacyVLLM: false });
      });
      expect(result.current.data).toEqual({
        type: ServingRuntimeModelType.GENERATIVE,
        legacyVLLM: false,
      });
    });
  });

  describe('Component', () => {
    const mockSetModelType = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render with default props', () => {
      render(<ModelTypeSelectField />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Select model type')).toBeInTheDocument();
    });

    it('should render with selected value', () => {
      render(
        <ModelTypeSelectField
          modelType={{ type: ServingRuntimeModelType.PREDICTIVE, legacyVLLM: false }}
        />,
      );
      expect(screen.getByText(ModelTypeLabel.PREDICTIVE)).toBeInTheDocument();
    });

    it('should call setModelType on valid selection', async () => {
      render(<ModelTypeSelectField setModelType={mockSetModelType} />);
      const button = screen.getByRole('button');

      await act(async () => {
        fireEvent.click(button);
      });
      const option = screen.getByText(ModelTypeLabel.GENERATIVE);
      await act(async () => {
        fireEvent.click(option);
      });

      expect(mockSetModelType).toHaveBeenCalledWith({
        type: ServingRuntimeModelType.GENERATIVE,
        legacyVLLM: false,
      });
    });

    it('should display validation errors', () => {
      const validationIssues: ZodIssue[] = [
        {
          code: 'custom',
          message: 'Select a model type.',
          path: [],
        },
      ];
      render(<ModelTypeSelectField validationIssues={validationIssues} />);
      expect(screen.getByText('Select a model type.')).toBeInTheDocument();
    });

    it('should render both model type options', async () => {
      render(<ModelTypeSelectField />);
      const button = screen.getByRole('button');

      await act(async () => {
        fireEvent.click(button);
      });

      expect(screen.getByText(ModelTypeLabel.PREDICTIVE)).toBeInTheDocument();
      expect(screen.getByText(ModelTypeLabel.GENERATIVE)).toBeInTheDocument();
    });
  });
});
