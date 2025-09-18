import React, { act } from 'react';
import { render, screen, fireEvent, renderHook } from '@testing-library/react';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import type { SupportedModelFormats, TemplateKind } from '@odh-dashboard/internal/k8sTypes';
import { ModelFormatField, modelFormatFieldSchema, useModelFormatField } from '../ModelFormatField';
import { useServingRuntimeTemplates } from '../../../../concepts/servingRuntimeTemplates/useServingRuntimeTemplates';

// Mock dependencies
jest.mock('../../../../concepts/servingRuntimeTemplates/useServingRuntimeTemplates');
jest.mock('@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils', () => ({
  getModelTypesFromTemplate: jest.fn(),
  getServingRuntimeFromTemplate: jest.fn(),
}));

const mockUseServingRuntimeTemplates = useServingRuntimeTemplates as jest.MockedFunction<
  typeof useServingRuntimeTemplates
>;

const {
  getModelTypesFromTemplate,
  getServingRuntimeFromTemplate,
} = require('@odh-dashboard/internal/pages/modelServing/customServingRuntimes/utils');

describe('ModelFormatField', () => {
  const mockFormats: SupportedModelFormats[] = [
    { name: 'tensorflow', version: '2.0' },
    { name: 'pytorch', version: '1.8' },
    { name: 'onnx' },
  ];

  const mockTemplate: Partial<TemplateKind> = {
    metadata: { name: 'test-template', namespace: 'test-namespace' },
  };

  const mockServingRuntime = {
    spec: {
      supportedModelFormats: mockFormats,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseServingRuntimeTemplates.mockReturnValue([[], false, undefined]);
    getModelTypesFromTemplate.mockReturnValue([]);
    getServingRuntimeFromTemplate.mockReturnValue(mockServingRuntime);
  });

  describe('Schema validation', () => {
    it('should validate when format is provided for predictive models', () => {
      const data = {
        type: ServingRuntimeModelType.PREDICTIVE,
        format: { name: 'tensorflow', version: '2.0' },
      };
      const result = modelFormatFieldSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate when no format is provided for generative models', () => {
      const data = {
        type: ServingRuntimeModelType.GENERATIVE,
      };
      const result = modelFormatFieldSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail validation when format is missing for predictive models', () => {
      const data = {
        type: ServingRuntimeModelType.PREDICTIVE,
      };
      const result = modelFormatFieldSchema.safeParse(data);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Model format is required for predictive models',
        );
      }
    });
  });

  describe('useModelFormatField hook', () => {
    it('should initialize with default values', () => {
      mockUseServingRuntimeTemplates.mockReturnValue([[], true, undefined]);

      const { result } = renderHook(() => useModelFormatField());

      expect(result.current.modelFormatOptions).toEqual([]);
      expect(result.current.modelFormat).toBeUndefined();
      expect(result.current.isVisible).toBe(false);
      expect(result.current.loaded).toBe(true);
      expect(result.current.error).toBeUndefined();
    });

    it('should initialize with initial model format', () => {
      mockUseServingRuntimeTemplates.mockReturnValue([[], true, undefined]);
      const initialFormat = { name: 'tensorflow', version: '2.0' };

      const { result } = renderHook(() => useModelFormatField(initialFormat));

      expect(result.current.modelFormat).toEqual(initialFormat);
    });

    it('should show field for predictive model type', () => {
      mockUseServingRuntimeTemplates.mockReturnValue([[], true, undefined]);

      const { result } = renderHook(() =>
        useModelFormatField(undefined, ServingRuntimeModelType.PREDICTIVE),
      );

      expect(result.current.isVisible).toBe(true);
    });

    it('should hide field for generative model type', () => {
      mockUseServingRuntimeTemplates.mockReturnValue([[], true, undefined]);

      const { result } = renderHook(() =>
        useModelFormatField(undefined, ServingRuntimeModelType.GENERATIVE),
      );

      expect(result.current.isVisible).toBe(false);
    });

    it('should return vLLM format for generative models', () => {
      mockUseServingRuntimeTemplates.mockReturnValue([[], true, undefined]);

      const { result } = renderHook(() =>
        useModelFormatField(undefined, ServingRuntimeModelType.GENERATIVE),
      );

      expect(result.current.modelFormat).toEqual({ name: 'vLLM' });
    });

    it('should extract and sort model formats from templates', () => {
      const templates = [mockTemplate] as TemplateKind[];
      mockUseServingRuntimeTemplates.mockReturnValue([templates, true, undefined]);
      getModelTypesFromTemplate.mockReturnValue([ServingRuntimeModelType.PREDICTIVE]);

      const { result } = renderHook(() =>
        useModelFormatField(undefined, ServingRuntimeModelType.PREDICTIVE),
      );

      expect(result.current.modelFormatOptions).toEqual([
        { name: 'onnx' },
        { name: 'pytorch', version: '1.8' },
        { name: 'tensorflow', version: '2.0' },
      ]);
    });

    it('should filter templates by model type', () => {
      const templates = [mockTemplate] as TemplateKind[];
      mockUseServingRuntimeTemplates.mockReturnValue([templates, true, undefined]);
      getModelTypesFromTemplate.mockReturnValue([ServingRuntimeModelType.GENERATIVE]);

      const { result } = renderHook(() =>
        useModelFormatField(undefined, ServingRuntimeModelType.PREDICTIVE),
      );

      expect(result.current.modelFormatOptions).toEqual([]);
    });

    it('should include templates with no model types for compatibility', () => {
      const templates = [mockTemplate] as TemplateKind[];
      mockUseServingRuntimeTemplates.mockReturnValue([templates, true, undefined]);
      getModelTypesFromTemplate.mockReturnValue([]);

      const { result } = renderHook(() =>
        useModelFormatField(undefined, ServingRuntimeModelType.PREDICTIVE),
      );

      expect(result.current.modelFormatOptions).toEqual([
        { name: 'onnx' },
        { name: 'pytorch', version: '1.8' },
        { name: 'tensorflow', version: '2.0' },
      ]);
    });

    it('should update model format', () => {
      mockUseServingRuntimeTemplates.mockReturnValue([[], true, undefined]);
      const newFormat = { name: 'pytorch', version: '1.8' };

      const { result } = renderHook(() =>
        useModelFormatField(undefined, ServingRuntimeModelType.PREDICTIVE),
      );

      act(() => {
        result.current.setModelFormat(newFormat);
      });

      expect(result.current.modelFormat).toEqual(newFormat);
    });

    it('should handle loading state', () => {
      mockUseServingRuntimeTemplates.mockReturnValue([[], false, undefined]);

      const { result } = renderHook(() => useModelFormatField());

      expect(result.current.loaded).toBe(false);
    });

    it('should handle error state', () => {
      const error = new Error('Failed to load templates');
      mockUseServingRuntimeTemplates.mockReturnValue([[], true, error]);

      const { result } = renderHook(() => useModelFormatField());

      expect(result.current.error).toBe(error);
    });

    it('should deduplicate model formats', () => {
      const duplicateFormats = [
        { name: 'tensorflow', version: '2.0' },
        { name: 'tensorflow', version: '2.0' },
        { name: 'pytorch' },
      ];
      const servingRuntimeWithDuplicates = {
        spec: { supportedModelFormats: duplicateFormats },
      };

      const templates = [mockTemplate, mockTemplate] as TemplateKind[];
      mockUseServingRuntimeTemplates.mockReturnValue([templates, true, undefined]);
      getModelTypesFromTemplate.mockReturnValue([ServingRuntimeModelType.PREDICTIVE]);
      getServingRuntimeFromTemplate.mockReturnValue(servingRuntimeWithDuplicates);

      const { result } = renderHook(() =>
        useModelFormatField(undefined, ServingRuntimeModelType.PREDICTIVE),
      );

      expect(result.current.modelFormatOptions).toEqual([
        { name: 'pytorch' },
        { name: 'tensorflow', version: '2.0' },
      ]);
    });
  });

  describe('Component', () => {
    const mockSetModelFormat = jest.fn();
    const defaultModelFormatState = {
      modelFormatOptions: mockFormats,
      modelFormat: undefined,
      setModelFormat: mockSetModelFormat,
      isVisible: true,
      loaded: true,
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should not render when not visible', () => {
      const { container } = render(
        <ModelFormatField modelFormatState={{ ...defaultModelFormatState, isVisible: false }} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('should render select field when visible', () => {
      render(<ModelFormatField modelFormatState={defaultModelFormatState} />);
      expect(screen.getByLabelText(/Model framework/)).toBeInTheDocument();
      expect(screen.getByText('Select a model format')).toBeInTheDocument();
    });

    it('should display selected format with version', () => {
      const stateWithSelection = {
        ...defaultModelFormatState,
        modelFormat: { name: 'tensorflow', version: '2.0' },
      };
      render(<ModelFormatField modelFormatState={stateWithSelection} />);
      expect(screen.getByText('tensorflow - 2.0')).toBeInTheDocument();
    });

    it('should display selected format without version', () => {
      const stateWithSelection = {
        ...defaultModelFormatState,
        modelFormat: { name: 'onnx' },
      };
      render(<ModelFormatField modelFormatState={stateWithSelection} />);
      expect(screen.getByText('onnx')).toBeInTheDocument();
    });

    it('should show skeleton when loading', () => {
      const { container } = render(
        <ModelFormatField modelFormatState={{ ...defaultModelFormatState, loaded: false }} />,
      );
      expect(container.querySelector('.pf-v6-c-skeleton')).toBeInTheDocument();
    });

    it('should display error message', () => {
      const error = new Error('Test error');
      render(<ModelFormatField modelFormatState={{ ...defaultModelFormatState, error }} />);
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should call setModelFormat on selection', async () => {
      render(<ModelFormatField modelFormatState={defaultModelFormatState} />);
      const button = screen.getByRole('button');

      await act(async () => {
        fireEvent.click(button);
      });

      const option = screen.getByText('tensorflow - 2.0');
      await act(async () => {
        fireEvent.click(option);
      });

      expect(mockSetModelFormat).toHaveBeenCalledWith({ name: 'tensorflow', version: '2.0' });
    });

    it('should handle format without version in selection', async () => {
      render(<ModelFormatField modelFormatState={defaultModelFormatState} />);
      const button = screen.getByRole('button');

      await act(async () => {
        fireEvent.click(button);
      });

      const option = screen.getByText('onnx');
      await act(async () => {
        fireEvent.click(option);
      });

      expect(mockSetModelFormat).toHaveBeenCalledWith({ name: 'onnx', version: undefined });
    });
  });
});
