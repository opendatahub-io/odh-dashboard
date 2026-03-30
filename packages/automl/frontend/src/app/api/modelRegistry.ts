/* eslint-disable camelcase -- BFF API uses snake_case */
import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restGET,
  restCREATE,
} from 'mod-arch-core';
import type { ModelRegistriesResponse, RegisterModelRequest } from '~/app/types';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

/**
 * Fetches available Model Registry instances from the AutoML BFF.
 * Returns registries with their readiness status and server URLs.
 *
 * Note: this endpoint does not require a namespace parameter. ModelRegistry CRs
 * are listed from the operator-managed rhoai-model-registries namespace by the BFF,
 * which handles RBAC scoping internally via the requesting user's identity.
 */
export async function getModelRegistries(
  hostPath: string,
  opts?: APIOptions,
): Promise<ModelRegistriesResponse> {
  const response = await handleRestFailures(
    restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/model-registries`, {}, opts ?? {}),
  );
  if (isModArchResponse<ModelRegistriesResponse>(response)) {
    return response.data;
  }
  throw new Error('Invalid response format');
}

export type RegisterModelParams = {
  namespace: string;
  registryUrl: string;
  request: RegisterModelRequest;
};

/**
 * Registers a model in the Model Registry via the AutoML BFF.
 * Creates a RegisteredModel, ModelVersion, and ModelArtifact in sequence.
 *
 * The registryUrl is the server_url of the selected ModelRegistry instance,
 * passed as a query parameter so the BFF routes the request to the correct registry.
 *
 * The BFF response contains the created ModelArtifact. The response shape is
 * defined by the prerequisite PR (#6764) and may evolve; typed as Record for now.
 */
export async function registerModel(
  hostPath: string,
  params: RegisterModelParams,
  opts?: APIOptions,
): Promise<Record<string, unknown>> {
  const response = await handleRestFailures(
    restCREATE(
      hostPath,
      `${URL_PREFIX}/api/${BFF_API_VERSION}/models/register`,
      params.request,
      { namespace: params.namespace, registryUrl: params.registryUrl },
      opts ?? {},
    ),
  );
  if (isModArchResponse<Record<string, unknown>>(response)) {
    return response.data;
  }
  throw new Error('Invalid response format');
}
