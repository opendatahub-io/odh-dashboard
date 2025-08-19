import React from 'react';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { type ZodIssue } from 'zod';
import {
  ModelTypeSelectField,
  modelTypeSelectFieldSchema,
  useModelTypeField,
  isValidModelType,
} from '../ModelTypeSelectField';

describe('ModelTypeSelectField', () => {
  describe('Schema validation', () => {
    it('should validate predictive-model', () => {
      const result = modelTypeSelectFieldSchema.safeParse('predictive-model');
      expect(result.success).toBe(true);
      expect(result.data).toBe('predictive-model');
    });

    it('should validate generative-model', () => {
      const result = modelTypeSelectFieldSchema.safeParse('generative-model');
      expect(result.success).toBe(true);
      expect(result.data).toBe('generative-model');
    });

    it('should reject invalid values', () => {
      const result = modelTypeSelectFieldSchema.safeParse('invalid-model');
      expect(result.success).toBe(false);
    });

    it('should show required error for undefined', () => {
      const result = modelTypeSelectFieldSchema.safeParse(undefined);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Select a model type.');
      }
    });
  });

  describe('isValidModelType', () => {
    it('should return true for valid model types', () => {
      expect(isValidModelType('predictive-model')).toBe(true);
      expect(isValidModelType('generative-model')).toBe(true);
    });

    it('should return false for invalid model types', () => {
      expect(isValidModelType('invalid')).toBe(false);
      expect(isValidModelType('')).toBe(false);
    });
  });

  describe('useModelTypeField hook', () => {
    it('should initialize with undefined by default', () => {
      const { result } = renderHook(() => useModelTypeField());
      expect(result.current[0]).toBeUndefined();
    });

    it('should initialize with existing data', () => {
      const { result } = renderHook(() => useModelTypeField('predictive-model'));
      expect(result.current[0]).toBe('predictive-model');
    });

    it('should update model type', () => {
      const { result } = renderHook(() => useModelTypeField());
      act(() => {
        result.current[1]('generative-model');
      });
      expect(result.current[0]).toBe('generative-model');
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
      render(<ModelTypeSelectField modelType="predictive-model" />);
      expect(screen.getByText('Predictive model')).toBeInTheDocument();
    });

    it('should call setModelType on valid selection', () => {
      render(<ModelTypeSelectField setModelType={mockSetModelType} />);
      const button = screen.getByRole('button');

      fireEvent.click(button);
      const option = screen.getByText('Generative AI model (e.g. LLM)');
      fireEvent.click(option);

      expect(mockSetModelType).toHaveBeenCalledWith('generative-model');
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

    it('should render both model type options', () => {
      render(<ModelTypeSelectField />);
      const button = screen.getByRole('button');

      fireEvent.click(button);

      expect(screen.getByText('Predictive model')).toBeInTheDocument();
      expect(screen.getByText('Generative AI model (e.g. LLM)')).toBeInTheDocument();
    });
  });
});
