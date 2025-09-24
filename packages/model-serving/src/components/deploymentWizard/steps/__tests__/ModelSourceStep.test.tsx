import React from 'react';
import { render, screen } from '@testing-library/react';
import { useWizardContext, useWizardFooter, ValidatedOptions } from '@patternfly/react-core';
import { z } from 'zod';
import { ServingRuntimeModelType } from '@odh-dashboard/internal/types';
import { ModelSourceStepContent } from '../ModelSourceStep';
import { modelTypeSelectFieldSchema } from '../../fields/ModelTypeSelectField';
import { mockDeploymentWizardState } from '../../../../__tests__/mockUtils';
import { isValidModelLocationData } from '../../fields/ModelLocationInputFields';
import { ModelLocationData, ModelLocationType } from '../../fields/modelLocationFields/types';

const modelSourceStepSchema = z.object({
  modelType: modelTypeSelectFieldSchema,
  modelLocationData: z.custom<ModelLocationData>((val) => {
    if (!val) return false;
    return isValidModelLocationData(val.type, val);
  }),
});

type ModelSourceStepData = z.infer<typeof modelSourceStepSchema>;

// Mock PatternFly wizard hooks
jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  useWizardContext: jest.fn(),
  useWizardFooter: jest.fn(),
}));

const mockUseWizardContext = useWizardContext as jest.MockedFunction<typeof useWizardContext>;
const mockUseWizardFooter = useWizardFooter as jest.MockedFunction<typeof useWizardFooter>;

describe('ModelSourceStep', () => {
  const mockValidation = {
    markFieldTouched: jest.fn(),
    getFieldValidation: jest.fn(() => []),
    getFieldValidationProps: jest.fn(() => ({
      validated: 'default' as ValidatedOptions.default,
      onBlur: jest.fn(),
    })),
  };

  const mockWizardContext = {
    activeStep: { index: 1, name: 'test-step', id: 'test-step', parentId: undefined },
    goToNextStep: jest.fn(),
    goToPrevStep: jest.fn(),
    close: jest.fn(),
    steps: [],
    footer: <div>Mock Footer</div>,
    goToStepById: jest.fn(),
    goToStepByName: jest.fn(),
    goToStepByIndex: jest.fn(),
    setFooter: jest.fn(),
    getStep: jest.fn(),
    setStep: jest.fn(),
    currentStepIndex: 1,
    hasBodyPadding: true,
    shouldFocusContent: true,
    mainWrapperRef: { current: null },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWizardContext.mockReturnValue(mockWizardContext);
    mockUseWizardFooter.mockImplementation(() => undefined);
  });

  describe('Schema validation', () => {
    it('should validate complete data', () => {
      const validData: ModelSourceStepData = {
        modelType: ServingRuntimeModelType.PREDICTIVE,
        modelLocationData: {
          type: ModelLocationType.PVC,
          fieldValues: {
            URI: 'pvc://test/test',
          },
          additionalFields: {
            pvcConnection: 'test',
          },
        },
      };
      const result = modelSourceStepSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject incomplete data', () => {
      const invalidData = {};
      const result = modelSourceStepSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('Component', () => {
    it('should render ModelTypeSelectField and ModelLocationSelectField', () => {
      render(
        <ModelSourceStepContent
          wizardState={mockDeploymentWizardState()}
          validation={mockValidation}
        />,
      );
      expect(screen.getByTestId('model-type-select')).toBeInTheDocument();
      expect(screen.getByTestId('model-location-select')).toBeInTheDocument();
    });

    it('should render with selected model type and model location', () => {
      const wizardDataWithSelection = mockDeploymentWizardState({
        state: {
          modelType: {
            data: ServingRuntimeModelType.GENERATIVE,
          },
          modelLocationData: {
            data: {
              type: ModelLocationType.NEW,
              fieldValues: {
                URI: 'https://test',
              },
              connectionTypeObject: {
                apiVersion: 'v1',
                kind: 'ConfigMap',
                metadata: {
                  name: 'uri-v1',
                  labels: {
                    'opendatahub.io/connection-type': 'true',
                    'opendatahub.io/dashboard': 'true',
                  },
                  annotations: {
                    'opendatahub.io/connection-type': 'uri - v1',
                  },
                },
              },
              additionalFields: {},
            },
          },
        },
      });
      render(
        <ModelSourceStepContent
          wizardState={wizardDataWithSelection}
          validation={mockValidation}
        />,
      );
      expect(screen.getByText('Generative AI model (e.g. LLM)')).toBeInTheDocument();
      expect(screen.getByTestId('field URI')).toHaveValue('https://test');
    });
  });
});
