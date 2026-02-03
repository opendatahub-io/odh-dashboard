import type { APIOptions } from 'mod-arch-core';
import type {
  MaaSModel,
  MaaSTokenResponse,
  MaaSTokenRequest,
} from '@odh-dashboard/gen-ai/extension-points';
import { createApiKey } from '~/app/api/api-keys';
import { getMaaSModelsList } from '~/app/api/maas-models';

export const getMaaSModelsWrapper: (
  queryParams?: Record<string, unknown>,
  opts?: APIOptions,
) => Promise<MaaSModel[]> = (_queryParams?: Record<string, unknown>, opts?: APIOptions) =>
  getMaaSModelsList()(opts ?? {});

export const generateMaaSTokenWrapper: (
  data: MaaSTokenRequest,
  opts?: APIOptions,
) => Promise<MaaSTokenResponse> = (data: MaaSTokenRequest, opts?: APIOptions) =>
  createApiKey()(opts ?? {}, data);
