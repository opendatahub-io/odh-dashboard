import * as z from 'zod';
import { getUrlValidationError } from '~/app/utils/validationUtils';

export const SOURCE_MODES = ['model', 'agent', 'prerecorded'] as const;
export const MODEL_SELECTIONS = ['cluster', 'external'] as const;
export const EXPERIMENT_MODES = ['existing', 'new'] as const;

export const startEvaluationRunSchema = z
  .object({
    evaluationName: z.string().trim().min(1, 'Evaluation name is required'),
    sourceMode: z.enum(SOURCE_MODES),
    modelSelection: z.enum(MODEL_SELECTIONS),
    selectedInferenceServiceName: z.string().optional(),
    modelName: z.string(),
    agentName: z.string(),
    endpointUrl: z.string(),
    apiKeySecretRef: z.string(),
    sourceName: z.string(),
    datasetUrl: z.string(),
    accessToken: z.string(),
    experimentMode: z.enum(EXPERIMENT_MODES),
    selectedExperimentName: z.string().optional(),
    newExperimentName: z.string(),
    threshold: z.number(),
    primaryMetric: z.string().optional(),
    showAdditionalArgs: z.boolean(),
    additionalArgs: z.string(),
    hardwareProfile: z.string().optional(),
    queue: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const hasExperiment =
      (data.experimentMode === 'existing' && !!data.selectedExperimentName?.trim()) ||
      (data.experimentMode === 'new' && data.newExperimentName.trim() !== '');

    if (!hasExperiment) {
      ctx.addIssue({
        code: 'custom',
        message: 'MLflow experiment is required',
        path: ['experimentMode'],
      });
    }

    if (data.sourceMode === 'model') {
      if (data.modelSelection === 'cluster') {
        if (!data.selectedInferenceServiceName?.trim()) {
          ctx.addIssue({
            code: 'custom',
            message: 'Model selection is required',
            path: ['selectedInferenceServiceName'],
          });
        }
        return;
      }

      if (data.modelName.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          message: 'Model name is required',
          path: ['modelName'],
        });
      }

      const endpointUrlError = getUrlValidationError(data.endpointUrl);
      if (endpointUrlError) {
        ctx.addIssue({
          code: 'custom',
          message: endpointUrlError,
          path: ['endpointUrl'],
        });
      }
      return;
    }

    if (data.sourceMode === 'agent') {
      if (data.agentName.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          message: 'Agent name is required',
          path: ['agentName'],
        });
      }

      const endpointUrlError = getUrlValidationError(data.endpointUrl);
      if (endpointUrlError) {
        ctx.addIssue({
          code: 'custom',
          message: endpointUrlError,
          path: ['endpointUrl'],
        });
      }
      return;
    }

    if (data.sourceName.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Source name is required',
        path: ['sourceName'],
      });
    }

    if (data.datasetUrl.trim() === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Dataset URL is required.',
        path: ['datasetUrl'],
      });
    }
  });

export type StartEvaluationRunFormValues = z.infer<typeof startEvaluationRunSchema>;

export const startEvaluationRunDefaultValues: StartEvaluationRunFormValues = {
  evaluationName: '',
  sourceMode: 'model',
  modelSelection: 'cluster',
  selectedInferenceServiceName: undefined,
  modelName: '',
  agentName: '',
  endpointUrl: '',
  apiKeySecretRef: '',
  sourceName: '',
  datasetUrl: '',
  accessToken: '',
  experimentMode: 'existing',
  selectedExperimentName: undefined,
  newExperimentName: '',
  threshold: 0,
  primaryMetric: undefined,
  showAdditionalArgs: false,
  additionalArgs: '',
  hardwareProfile: undefined,
  queue: undefined,
};
