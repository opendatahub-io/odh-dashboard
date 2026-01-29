import type { APIOptions } from 'mod-arch-core';
import type {
  MaaSModel,
  MaaSTokenResponse,
  MaaSTokenRequest,
  ModArchRestGET,
  ModArchRestCREATE,
} from '@odh-dashboard/gen-ai/extension-points';
import { createAPIKey } from '~/app/api/api-keys';
import { getMaaSModelsList } from '~/app/api/maas-models';

// MaaS API uses its own host path (empty string uses relative URLs)
const MAAS_HOST_PATH = '';

export const getMaaSModelsWrapper: ModArchRestGET<MaaSModel[]> = (
  _queryParams?: Record<string, unknown>,
  opts?: APIOptions,
) => getMaaSModelsList(MAAS_HOST_PATH)(opts ?? {});

export const generateMaaSTokenWrapper: ModArchRestCREATE<MaaSTokenResponse, MaaSTokenRequest> = (
  data: MaaSTokenRequest,
  opts?: APIOptions,
) => createAPIKey(MAAS_HOST_PATH)(opts ?? {}, data);
