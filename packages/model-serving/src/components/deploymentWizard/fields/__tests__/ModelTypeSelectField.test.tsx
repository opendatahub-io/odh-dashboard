import React, { act } from 'react';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { type ZodIssue } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { mockExtensions } from '../../../../__tests__/mockUtils';
import {
  ModelTypeSelectField,
  modelTypeSelectFieldSchema,
  useModelTypeField,
} from '../ModelTypeSelectField';
import { ModelTypeLabel } from '../../types';

jest.mock('@odh-dashboard/plugin-core');

describe('ModelTypeSelectField', () => {
  beforeEach(() => {
    mockExtensions([]);
  });
  describe('Schema validation', () => {
    it('should validate predictive', () => {
      const result = modelTypeSelectFieldSchema.safeParse({
        type: ServingRuntimeModelType.PREDICTIVE,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: ServingRuntimeModelType.PREDICTIVE,
      });
    });

    it('should validate generative-model', () => {
      const result = modelTypeSelectFieldSchema.safeParse({
        type: ServingRuntimeModelType.GENERATIVE,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        type: ServingRuntimeModelType.GENERATIVE,
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

  describe('useModelTypeField hook', () => {
    it('should initialize with undefined by default', () => {
      const { result } = renderHook(() => useModelTypeField());
      expect(result.current.data).toBeUndefined();
    });

    it('should initialize with existing data', () => {
      const { result } = renderHook(() =>
        useModelTypeField({ type: ServingRuntimeModelType.PREDICTIVE }),
      );
      expect(result.current.data).toEqual({
        type: ServingRuntimeModelType.PREDICTIVE,
      });
    });

    it('should update model type', () => {
      const { result } = renderHook(() => useModelTypeField());
      act(() => {
        result.current.setData({ type: ServingRuntimeModelType.GENERATIVE });
      });
      expect(result.current.data).toEqual({
        type: ServingRuntimeModelType.GENERATIVE,
      });
    });
  });

  describe('Component', () => {
    const mockSetModelType = jest.fn();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should render with default props', () => {
      render(<ModelTypeSelectField externalData={{ data: { extraOptions: [], forced: false } }} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
      expect(screen.getByText('Select model type')).toBeInTheDocument();
    });

    it('should render with selected value', () => {
      render(
        <ModelTypeSelectField
          modelType={{ type: ServingRuntimeModelType.PREDICTIVE }}
          externalData={{ data: { extraOptions: [], forced: false } }}
        />,
      );
      expect(screen.getByText(ModelTypeLabel.PREDICTIVE)).toBeInTheDocument();
    });

    it('should call setModelType on valid selection', async () => {
      render(
        <ModelTypeSelectField
          setModelType={mockSetModelType}
          externalData={{ data: { extraOptions: [], forced: false } }}
        />,
      );
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
      render(
        <ModelTypeSelectField
          validationIssues={validationIssues}
          externalData={{ data: { extraOptions: [], forced: false } }}
        />,
      );
      expect(screen.getByText('Select a model type.')).toBeInTheDocument();
    });

    it('should render both model type options', async () => {
      render(<ModelTypeSelectField externalData={{ data: { extraOptions: [], forced: false } }} />);
      const button = screen.getByRole('button');

      await act(async () => {
        fireEvent.click(button);
      });

      expect(screen.getByText(ModelTypeLabel.PREDICTIVE)).toBeInTheDocument();
      expect(screen.getByText(ModelTypeLabel.GENERATIVE)).toBeInTheDocument();
    });

    it('should render extra options', async () => {
      render(
        <ModelTypeSelectField
          externalData={{
            data: { extraOptions: [{ key: 'extra-option', label: 'Extra Option' }], forced: false },
          }}
        />,
      );
      const button = screen.getByRole('button');

      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.getByText('Extra Option')).toBeInTheDocument();
    });

    it('should disable model type select when forced', () => {
      render(<ModelTypeSelectField externalData={{ data: { extraOptions: [], forced: true } }} />);
      expect(screen.getByRole('button', { name: 'Options menu' })).toHaveClass('pf-m-disabled');
    });
  });
});
