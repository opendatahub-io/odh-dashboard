import React from 'react';
import { render, screen } from '@testing-library/react';
import { useWizardContext, useWizardFooter } from '@patternfly/react-core';
import { z } from 'zod';
import { ModelSourceStepContent } from '../ModelSourceStep';
import { modelTypeSelectFieldSchema } from '../../fields/ModelTypeSelectField';

const modelSourceStepSchema = z.object({
  modelType: modelTypeSelectFieldSchema,
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
  const mockWizardData = {
    modelTypeField: undefined,
    setModelType: jest.fn(),
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
        modelType: 'predictive-model',
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
    it('should render ModelTypeSelectField', () => {
      render(<ModelSourceStepContent wizardData={mockWizardData} />);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with selected model type', () => {
      const wizardDataWithSelection = {
        ...mockWizardData,
        modelTypeField: 'generative-model' as const,
      };
      render(<ModelSourceStepContent wizardData={wizardDataWithSelection} />);
      expect(screen.getByText('Generative AI model (e.g. LLM)')).toBeInTheDocument();
    });

    it('should setup wizard footer', () => {
      render(<ModelSourceStepContent wizardData={mockWizardData} />);
      expect(mockUseWizardFooter).toHaveBeenCalledWith(
        expect.objectContaining({
          props: expect.objectContaining({
            activeStep: mockWizardContext.activeStep,
            nextButtonText: 'Next',
          }),
        }),
      );
    });
  });
});
