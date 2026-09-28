import {
  startEvaluationRunDefaultValues,
  startEvaluationRunSchema,
  type StartEvaluationRunFormValues,
} from '~/app/schemas/startEvaluationRun.schema';

const validValues = (): StartEvaluationRunFormValues => ({
  ...startEvaluationRunDefaultValues,
  evaluationName: 'My evaluation',
  selectedInferenceServiceName: 'model-a',
  selectedExperimentName: 'EvalHub',
});

describe('startEvaluationRunSchema', () => {
  it('should require a selected cluster model', () => {
    const result = startEvaluationRunSchema.safeParse({
      ...validValues(),
      selectedInferenceServiceName: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['selectedInferenceServiceName'],
            message: 'Model selection is required',
          }),
        ]),
      );
    }
  });

  it('should validate only the external model fields when using an external model', () => {
    const invalidResult = startEvaluationRunSchema.safeParse({
      ...validValues(),
      modelSelection: 'external',
      selectedInferenceServiceName: undefined,
      modelName: '',
      endpointUrl: 'not-a-url',
    });

    expect(invalidResult.success).toBe(false);
    if (!invalidResult.success) {
      expect(invalidResult.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['modelName'], message: 'Model name is required' }),
          expect.objectContaining({ path: ['endpointUrl'] }),
        ]),
      );
    }

    expect(
      startEvaluationRunSchema.safeParse({
        ...validValues(),
        modelSelection: 'external',
        selectedInferenceServiceName: undefined,
        modelName: 'external-model',
        endpointUrl: 'https://model.example.com/v1',
      }).success,
    ).toBe(true);
  });

  it('should require agent-specific fields without requiring a selected model', () => {
    const invalidResult = startEvaluationRunSchema.safeParse({
      ...validValues(),
      sourceMode: 'agent',
      selectedInferenceServiceName: undefined,
      agentName: '',
      endpointUrl: '',
    });

    expect(invalidResult.success).toBe(false);
    if (!invalidResult.success) {
      expect(invalidResult.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['agentName'], message: 'Agent name is required' }),
          expect.objectContaining({ path: ['endpointUrl'] }),
        ]),
      );
    }

    expect(
      startEvaluationRunSchema.safeParse({
        ...validValues(),
        sourceMode: 'agent',
        selectedInferenceServiceName: undefined,
        agentName: 'my-agent',
        endpointUrl: 'https://agent.example.com/v1',
      }).success,
    ).toBe(true);
  });

  it('should require prerecorded source data without requiring model or endpoint fields', () => {
    const invalidResult = startEvaluationRunSchema.safeParse({
      ...validValues(),
      sourceMode: 'prerecorded',
      selectedInferenceServiceName: undefined,
      sourceName: '',
      datasetUrl: '',
    });

    expect(invalidResult.success).toBe(false);
    if (!invalidResult.success) {
      expect(invalidResult.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ['sourceName'], message: 'Source name is required' }),
          expect.objectContaining({ path: ['datasetUrl'], message: 'Dataset URL is required.' }),
        ]),
      );
    }

    expect(
      startEvaluationRunSchema.safeParse({
        ...validValues(),
        sourceMode: 'prerecorded',
        selectedInferenceServiceName: undefined,
        sourceName: 'Recorded responses',
        datasetUrl: 'not-required-to-be-a-url-by-this-form',
      }).success,
    ).toBe(true);
  });

  it('should require the selected experiment only in existing experiment mode', () => {
    const existingResult = startEvaluationRunSchema.safeParse({
      ...validValues(),
      selectedExperimentName: undefined,
    });

    expect(existingResult.success).toBe(false);
    if (!existingResult.success) {
      expect(existingResult.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['experimentMode'],
            message: 'MLflow experiment is required',
          }),
        ]),
      );
    }

    expect(
      startEvaluationRunSchema.safeParse({
        ...validValues(),
        experimentMode: 'new',
        selectedExperimentName: undefined,
        newExperimentName: 'A new experiment',
      }).success,
    ).toBe(true);
  });
});
