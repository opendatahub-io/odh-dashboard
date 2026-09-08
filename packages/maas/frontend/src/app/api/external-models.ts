import {
  APIOptions,
  assembleModArchBody,
  handleRestFailures,
  isModArchResponse,
  restCREATE,
  restDELETE,
  restGET,
  restUPDATE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import {
  AuthMechanism,
  ExternalModel,
  ExternalModelMaaSModelRefStatus,
  ExternalProviderDetails,
  ExternalProvider,
  CreateExternalModelRequest,
  UpdateExternalModelRequest,
  CreateExternalProviderRequest,
  UpdateExternalProviderRequest,
  CreateSecretRequest,
  CreateSecretResponse,
  SecretSummary,
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
  typeof v.credentialSecretRef === 'string' &&
  typeof v.provider === 'string' &&
  (v.config === undefined || isStringRecord(v.config)) &&
  isOptionalString(v.phase) &&
  isOptionalString(v.statusMessage) &&
  isOptionalString(v.reason);

const isExternalProvider = (v: unknown): v is ExternalProvider =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  isOptionalString(v.displayName) &&
  isOptionalString(v.description) &&
  typeof v.endpointUrl === 'string' &&
  typeof v.authMechanism === 'string' &&
  isAuthMechanism(v.authMechanism) &&
  typeof v.credentialSecretRef === 'string' &&
  typeof v.provider === 'string' &&
  (v.config === undefined || isStringRecord(v.config)) &&
  isOptionalString(v.phase) &&
  isOptionalString(v.statusMessage) &&
  isOptionalString(v.reason);

const isProviderRef = (v: unknown): v is ProviderRef =>
  isRecord(v) &&
  typeof v.providerName === 'string' &&
  typeof v.weight === 'number' &&
  typeof v.apiFormat === 'string' &&
  typeof v.path === 'string' &&
  typeof v.targetModel === 'string' &&
  (v.config === undefined || isStringRecord(v.config)) &&
  (v.authMechanism === undefined || isAuthMechanism(v.authMechanism)) &&
  (v.credentialSecretRef === undefined || typeof v.credentialSecretRef === 'string') &&
  (v.provider === undefined || isExternalProviderDetails(v.provider));

const isExternalModelMaaSModelRefStatus = (v: unknown): v is ExternalModelMaaSModelRefStatus =>
  isRecord(v) &&
  isOptionalString(v.phase) &&
  isOptionalString(v.endpoint) &&
  isOptionalString(v.statusMessage) &&
  isOptionalString(v.reason) &&
  (v.governanceAttached === undefined || typeof v.governanceAttached === 'boolean');

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
  isOptionalString(v.reason) &&
  (v.maaSModelRef === undefined || isExternalModelMaaSModelRefStatus(v.maaSModelRef));

const isSecretSummary = (v: unknown): v is SecretSummary =>
  isRecord(v) && typeof v.name === 'string';

const isCreateSecretResponse = (v: unknown): v is CreateSecretResponse =>
  isRecord(v) && typeof v.name === 'string';

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

/** POST /api/v1/externalmodel - Create an ExternalModel */
export const createExternalModel =
  (hostPath = '') =>
  (opts: APIOptions, request: CreateExternalModelRequest): Promise<ExternalModel> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/externalmodel`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isExternalModel(response.data)) {
        return normalizeExternalModel(response.data);
      }
      throw new Error('Invalid response format');
    });

/** PUT /api/v1/externalmodel/:namespace/:name - Update an ExternalModel */
export const updateExternalModel =
  (hostPath = '') =>
  (
    opts: APIOptions,
    namespace: string,
    name: string,
    request: UpdateExternalModelRequest,
  ): Promise<ExternalModel> =>
    handleRestFailures(
      restUPDATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/externalmodel/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isExternalModel(response.data)) {
        return normalizeExternalModel(response.data);
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

/** GET /api/v1/externalprovider?namespace=X - List ExternalProviders */
export const listExternalProviders =
  (hostPath = '') =>
  (opts: APIOptions, namespace: string): Promise<ExternalProvider[]> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/externalprovider`,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && Array.isArray(response.data)) {
        return response.data.filter(isExternalProvider);
      }
      throw new Error('Invalid response format');
    });

/** POST /api/v1/externalprovider - Create an ExternalProvider */
export const createExternalProvider =
  (hostPath = '') =>
  (opts: APIOptions, request: CreateExternalProviderRequest): Promise<ExternalProvider> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/externalprovider`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isExternalProvider(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** PUT /api/v1/externalprovider/:namespace/:name - Update an ExternalProvider */
export const updateExternalProvider =
  (hostPath = '') =>
  (
    opts: APIOptions,
    namespace: string,
    name: string,
    request: UpdateExternalProviderRequest,
  ): Promise<ExternalProvider> =>
    handleRestFailures(
      restUPDATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/externalprovider/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isExternalProvider(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** DELETE /api/v1/externalprovider/:namespace/:name - Delete an ExternalProvider */
export const deleteExternalProvider =
  (hostPath = '') =>
  (opts: APIOptions, namespace: string, name: string): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/externalprovider/${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`,
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

/** GET /api/v1/secrets?namespace=X - List BBR-managed Secret names */
export const listSecrets =
  (hostPath = '') =>
  (opts: APIOptions, namespace: string): Promise<SecretSummary[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/secrets`, { namespace }, opts),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && Array.isArray(response.data)) {
        return response.data.filter(isSecretSummary);
      }
      throw new Error('Invalid response format');
    });

/** POST /api/v1/secrets - Create a Secret */
export const createSecret =
  (hostPath = '') =>
  (opts: APIOptions, request: CreateSecretRequest): Promise<CreateSecretResponse> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/secrets`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isCreateSecretResponse(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
