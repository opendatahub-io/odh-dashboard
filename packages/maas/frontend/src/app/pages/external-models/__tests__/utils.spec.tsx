import * as React from 'react';
import { render } from '@testing-library/react';
import { ExternalModel } from '~/app/types/external-models';
import { PhaseStatus } from '~/app/utilities/phaseLabelUtils';
import {
  AWAITING_GOVERNANCE_PAIRING_MESSAGE,
  filterExternalModelsByKeyword,
  getExternalModelResource,
  getExternalModelStatusMessage,
  getProviderRefResource,
  isAwaitingGovernancePairing,
  mapAuthMechanismToHumanReadable,
} from '~/app/pages/external-models/utils';

const baseModel = (overrides: Partial<ExternalModel> = {}): ExternalModel => ({
  name: 'gpt-4o-external',
  namespace: 'test-project',
  displayName: 'GPT-4o External',
  description: 'External GPT-4o model routed through OpenAI provider.',
  providerRefs: [],
  phase: PhaseStatus.READY,
  ...overrides,
});

describe('isAwaitingGovernancePairing', () => {
  it('should return true when maaSModelRef statusMessage matches awaiting pairing', () => {
    expect(
      isAwaitingGovernancePairing(
        baseModel({
          maaSModelRef: { statusMessage: AWAITING_GOVERNANCE_PAIRING_MESSAGE },
        }),
      ),
    ).toBe(true);
  });

  it('should return false when maaSModelRef is missing or has a different message', () => {
    expect(isAwaitingGovernancePairing(baseModel())).toBe(false);
    expect(
      isAwaitingGovernancePairing(
        baseModel({ maaSModelRef: { statusMessage: 'Published external GPT-4o model' } }),
      ),
    ).toBe(false);
  });
  it('should return true when maaSModelRef governanceAttached is false', () => {
    expect(
      isAwaitingGovernancePairing(baseModel({ maaSModelRef: { governanceAttached: false } })),
    ).toBe(true);
  });
  it('should return true when maaSModelRef governanceAttached is true', () => {
    expect(
      isAwaitingGovernancePairing(baseModel({ maaSModelRef: { governanceAttached: true } })),
    ).toBe(false);
  });
});

describe('filterExternalModelsByKeyword', () => {
  const models = [
    baseModel(),
    baseModel({
      name: 'claude-split',
      displayName: 'Claude A/B Split',
      description: 'Weighted routing across Anthropic and Bedrock providers.',
    }),
    baseModel({
      name: 'awaiting-pairing-model',
      displayName: 'Awaiting Pairing Model',
      description: 'Model waiting for subscription and auth pairing.',
    }),
  ];

  it('should return all models when keyword is empty or whitespace', () => {
    expect(filterExternalModelsByKeyword(models)).toEqual(models);
    expect(filterExternalModelsByKeyword(models, '   ')).toEqual(models);
  });

  it('should filter by resource name', () => {
    expect(filterExternalModelsByKeyword(models, 'gpt-4o-external')).toEqual([models[0]]);
  });

  it('should filter by display name', () => {
    expect(filterExternalModelsByKeyword(models, 'Claude A/B')).toEqual([models[1]]);
  });

  it('should filter by description', () => {
    expect(filterExternalModelsByKeyword(models, 'subscription and auth pairing')).toEqual([
      models[2],
    ]);
  });

  it('should be case insensitive', () => {
    expect(filterExternalModelsByKeyword(models, 'OPENAI PROVIDER')).toEqual([models[0]]);
  });
});

describe('getExternalModelStatusMessage', () => {
  it('should return pending reconciliation copy', () => {
    const { container } = render(
      <>{getExternalModelStatusMessage(baseModel({ phase: PhaseStatus.PENDING }))}</>,
    );
    expect(container.textContent).toContain('is being reconciled');
    expect(container.textContent).toContain('GPT-4o External');
  });

  it('should return failed reconciliation copy', () => {
    const { container } = render(
      <>{getExternalModelStatusMessage(baseModel({ phase: PhaseStatus.FAILED }))}</>,
    );
    expect(container.textContent).toContain('could not be reconciled');
  });

  it('should return ready reconciliation copy', () => {
    const { container } = render(<>{getExternalModelStatusMessage(baseModel())}</>);
    expect(container.textContent).toContain('have been created successfully');
  });

  it('should fall back to resource name when display name is missing', () => {
    const { container } = render(
      <>
        {getExternalModelStatusMessage(
          baseModel({ displayName: undefined, phase: PhaseStatus.READY }),
        )}
      </>,
    );
    expect(container.textContent).toContain('gpt-4o-external');
  });

  it('should return generic message for unknown phases', () => {
    expect(getExternalModelStatusMessage(baseModel({ phase: 'SomethingElse' }))).toBe(
      'The status of this external model is unknown.',
    );
  });
});

describe('mapAuthMechanismToHumanReadable', () => {
  it('should map known auth mechanisms', () => {
    expect(mapAuthMechanismToHumanReadable('apikey')).toBe('API key');
    expect(mapAuthMechanismToHumanReadable('sigv4')).toBe('Signature Version 4');
    expect(mapAuthMechanismToHumanReadable('oauth2')).toBe('OAuth 2.0');
  });
});

describe('getExternalModelResource', () => {
  it('should build a MaaSExternalModel resource reference', () => {
    expect(getExternalModelResource(baseModel())).toEqual({
      apiVersion: 'maas.opendatahub.io/v1alpha1',
      kind: 'MaaSExternalModel',
      metadata: {
        name: 'gpt-4o-external',
        namespace: 'test-project',
      },
    });
  });
});

describe('getProviderRefResource', () => {
  it('should build a MaaSExternalProvider resource reference', () => {
    expect(
      getProviderRefResource({
        providerName: 'openai-prod',
        weight: 100,
        apiFormat: 'openai-chat',
        path: '/v1/chat/completions',
        targetModel: 'gpt-4o',
      }),
    ).toEqual({
      apiVersion: 'maas.opendatahub.io/v1alpha1',
      kind: 'MaaSExternalProvider',
      metadata: {
        name: 'openai-prod',
      },
    });
  });
});
