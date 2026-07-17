import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restDELETE,
  restGET,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import {
  AuthMechanism,
  ExternalModel,
  ExternalModelMaaSModelRefStatus,
  ExternalProviderDetails,
  ProviderRef,
} from '~/app/types/external-models';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isOptionalString = (v: unknown): v is string | undefined =>
  v === undefined || typeof v === 'string';

const isAuthMechanism = (v: unknown): v is AuthMechanism =>
  v === 'apikey' || v === 'sigv4' || v === 'oauth2';

const isStringRecord = (v: unknown): v is Record<string, string> =>
  isRecord(v) && Object.values(v).every((value) => typeof value === 'string');

const isExternalProviderDetails = (v: unknown): v is ExternalProviderDetails =>
  isRecord(v) &&
  isOptionalString(v.displayName) &&
  isOptionalString(v.description) &&
  typeof v.endpointUrl === 'string' &&
  typeof v.authMechanism === 'string' &&
  isAuthMechanism(v.authMechanism) &&
  typeof v.provider === 'string' &&
  (v.config === undefined || isStringRecord(v.config)) &&
  isOptionalString(v.phase) &&
  isOptionalString(v.statusMessage);

const isProviderRef = (v: unknown): v is ProviderRef =>
  isRecord(v) &&
  typeof v.providerName === 'string' &&
  typeof v.weight === 'number' &&
  typeof v.apiFormat === 'string' &&
  typeof v.path === 'string' &&
  typeof v.targetModel === 'string' &&
  (v.config === undefined || isStringRecord(v.config)) &&
  (v.provider === undefined || isExternalProviderDetails(v.provider));

const isExternalModelMaaSModelRefStatus = (v: unknown): v is ExternalModelMaaSModelRefStatus =>
  isRecord(v) &&
  isOptionalString(v.phase) &&
  isOptionalString(v.endpoint) &&
  isOptionalString(v.statusMessage);

const isExternalModel = (v: unknown): v is ExternalModel =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  isOptionalString(v.displayName) &&
  isOptionalString(v.description) &&
  isOptionalString(v.modelName) &&
  (v.providerRefs == null ||
    (Array.isArray(v.providerRefs) && v.providerRefs.every(isProviderRef))) &&
  isOptionalString(v.phase) &&
  isOptionalString(v.statusMessage) &&
  (v.maaSModelRef === undefined || isExternalModelMaaSModelRefStatus(v.maaSModelRef));

/** Coerce null providerRefs (Go nil slice → JSON null) to empty arrays. */
const normalizeExternalModel = (model: ExternalModel): ExternalModel => ({
  ...model,
  providerRefs: Array.isArray(model.providerRefs) ? model.providerRefs : [],
});

/** GET /api/v1/externalmodel?namespace=X - List ExternalModels */
export const listExternalModels =
  (hostPath = '') =>
  (opts: APIOptions, namespace: string): Promise<ExternalModel[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/externalmodel`, { namespace }, opts),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && Array.isArray(response.data)) {
        return response.data.filter(isExternalModel).map(normalizeExternalModel);
      }
      throw new Error('Invalid response format');
    });

/** DELETE /api/v1/externalmodel/:namespace/:name - Delete an ExternalModel */
export const deleteExternalModel =
  (hostPath = '') =>
  (opts: APIOptions, namespace: string, name: string): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/externalmodel/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        {},
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && response.data == null) {
        return;
      }
      throw new Error('Invalid response format');
    });
