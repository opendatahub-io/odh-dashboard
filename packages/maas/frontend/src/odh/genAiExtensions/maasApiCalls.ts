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

export const getMaaSModelsWrapper: ModArchRestGET<MaaSModel[]> = (
  _queryParams?: Record<string, unknown>,
  opts?: APIOptions,
) => getMaaSModelsList()(opts ?? {});

export const generateMaaSTokenWrapper: ModArchRestCREATE<MaaSTokenResponse, MaaSTokenRequest> = (
  data: MaaSTokenRequest,
  opts?: APIOptions,
) => createAPIKey()(opts ?? {}, data);
