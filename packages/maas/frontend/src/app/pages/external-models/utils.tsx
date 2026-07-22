import { K8sResourceCommon } from '@odh-dashboard/k8s-core';
import * as React from 'react';
import { AuthMechanism, ExternalModel, ProviderRef } from '~/app/types/external-models';
import { PhaseStatus } from '~/app/utilities/phaseLabelUtils';

/** Ready-condition message on the companion MaaSModelRef when sub+auth pairing is missing. */
export const AWAITING_GOVERNANCE_PAIRING_MESSAGE = 'Awaiting governance pairing';

export const isMissingMaaSModelRef = (externalModel: ExternalModel): boolean =>
  externalModel.maaSModelRef === undefined;

export const isAwaitingGovernancePairing = (externalModel: ExternalModel): boolean =>
  externalModel.maaSModelRef?.statusMessage === AWAITING_GOVERNANCE_PAIRING_MESSAGE ||
  externalModel.maaSModelRef?.governanceAttached === false;

export const filterExternalModelsByKeyword = (
  models: ExternalModel[],
  keyword?: string,
): ExternalModel[] => {
  const normalized = keyword?.trim().toLowerCase();
  if (!normalized) {
    return models;
  }
  return models.filter(
    (model) =>
      model.name.toLowerCase().includes(normalized) ||
      model.displayName?.toLowerCase().includes(normalized) ||
      model.description?.toLowerCase().includes(normalized),
  );
};

export const getExternalModelStatusMessage = (externalModel: ExternalModel): React.ReactNode => {
  const modelName = <strong>{externalModel.displayName ?? externalModel.name}</strong>;

  if (externalModel.phase === PhaseStatus.PENDING) {
    return <>{modelName} is being set up. This typically completes within a few seconds.</>;
  }
  if (externalModel.phase === PhaseStatus.FAILED) {
    return (
      <>
        {modelName} failed to set up. Common causes include a missing provider reference or secret,
        invalid path configuration, or a network policy issue. For details, check the model&apos;s
        conditions.
      </>
    );
  }
  if (externalModel.phase === PhaseStatus.READY) {
    return <>{modelName} is ready. Requests are being routed to the configured provider(s).</>;
  }
  return 'The status of this external model is unknown.';
};

export const mapAuthMechanismToHumanReadable = (authMechanism: AuthMechanism): string => {
  switch (authMechanism) {
    case 'apikey':
      return 'API key';
    case 'sigv4':
      return 'Signature Version 4';
    case 'oauth2':
      return 'OAuth 2.0';
    default:
      return authMechanism;
  }
};

export const getExternalModelResource = (model: ExternalModel): K8sResourceCommon => ({
  apiVersion: 'maas.opendatahub.io/v1alpha1',
  kind: 'MaaSExternalModel',
  metadata: {
    name: model.name,
    namespace: model.namespace,
  },
});

export const getProviderRefResource = (providerRef: ProviderRef): K8sResourceCommon => ({
  apiVersion: 'maas.opendatahub.io/v1alpha1',
  kind: 'MaaSExternalProvider',
  metadata: {
    name: providerRef.providerName,
  },
});
