import {
  getAffectedModels,
  getAffectedModelsFromRefs,
  MODEL_NOT_FOUND_STATUS_MESSAGE,
  PhaseStatus,
} from '~/app/utilities/phaseLabelUtils';
import type { MaaSModelRefSummary } from '~/app/types/subscriptions';

describe('getAffectedModels', () => {
  it('should return non-Ready models and map missing phase to Unavailable not-found', () => {
    const result = getAffectedModels([
      { name: 'ready-model', displayName: 'Ready', phase: PhaseStatus.READY },
      { name: 'active-model', displayName: 'Active', phase: PhaseStatus.ACTIVE },
      {
        name: 'unavailable-model',
        displayName: 'Unavailable',
        phase: PhaseStatus.UNAVAILABLE,
        statusMessage: 'Down',
      },
      { name: 'missing-model', namespace: 'gone-ns', displayName: 'Missing' },
      {
        name: 'failed-model',
        phase: PhaseStatus.FAILED,
        statusMessage: 'Setup failed',
      },
    ]);

    expect(result).toEqual([
      {
        name: 'unavailable-model',
        namespace: undefined,
        displayName: 'Unavailable',
        phase: PhaseStatus.UNAVAILABLE,
        statusMessage: 'Down',
      },
      {
        name: 'missing-model',
        namespace: 'gone-ns',
        displayName: 'Missing',
        phase: PhaseStatus.UNAVAILABLE,
        statusMessage: MODEL_NOT_FOUND_STATUS_MESSAGE,
      },
      {
        name: 'failed-model',
        namespace: undefined,
        displayName: undefined,
        phase: PhaseStatus.FAILED,
        statusMessage: 'Setup failed',
      },
    ]);
  });

  it('should return an empty array when all models are Ready', () => {
    expect(
      getAffectedModels([
        { name: 'a', phase: PhaseStatus.READY },
        { name: 'b', phase: PhaseStatus.ACTIVE },
      ]),
    ).toEqual([]);
  });

  it('should preserve an existing status message on unknown-phase refs', () => {
    expect(
      getAffectedModels([
        {
          name: 'transient',
          statusMessage: 'Unable to check model. A Transient error occurred.',
        },
      ]),
    ).toEqual([
      {
        name: 'transient',
        namespace: undefined,
        displayName: undefined,
        phase: PhaseStatus.UNAVAILABLE,
        statusMessage: 'Unable to check model. A Transient error occurred.',
      },
    ]);
  });
});

describe('getAffectedModelsFromRefs', () => {
  const catalog: MaaSModelRefSummary[] = [
    {
      name: 'good-model',
      namespace: 'maas-models',
      modelRef: { kind: 'LLMInferenceService', name: 'good-model' },
      phase: PhaseStatus.READY,
    },
    {
      name: 'bad-model',
      namespace: 'maas-models',
      modelRef: { kind: 'LLMInferenceService', name: 'bad-model' },
      phase: PhaseStatus.UNAVAILABLE,
      statusMessage: 'Inference service is down',
    },
  ];

  it('should mark refs missing from the catalog as not found', () => {
    const result = getAffectedModelsFromRefs(
      [
        { name: 'good-model', namespace: 'maas-models' },
        { name: 'bad-model', namespace: 'maas-models' },
        { name: 'ghost-model', namespace: 'does-not-exist' },
      ],
      catalog,
    );

    expect(result).toEqual([
      {
        name: 'bad-model',
        namespace: 'maas-models',
        displayName: undefined,
        phase: PhaseStatus.UNAVAILABLE,
        statusMessage: 'Inference service is down',
      },
      {
        name: 'ghost-model',
        namespace: 'does-not-exist',
        displayName: undefined,
        phase: PhaseStatus.UNAVAILABLE,
        statusMessage: MODEL_NOT_FOUND_STATUS_MESSAGE,
      },
    ]);
  });
});
