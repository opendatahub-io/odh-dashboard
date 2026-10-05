import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import * as z from 'zod';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import type { MaaSModelsResponse } from '~/app/types';

const MaaSModelsResponseSchema = z.object({
  /* eslint-disable camelcase */
  models: z.array(
    z.object({
      id: z.string(),
      display_name: z.string().optional(),
      description: z.string().optional(),
      owned_by: z.string().optional(),
      ready: z.boolean(),
    }),
  ),
  /* eslint-enable camelcase */
});

export const getSecretByName =
  (hostPath: string) =>
  (namespace: string, secretName: string) =>
  (opts: APIOptions): Promise<Record<string, string>> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/secret/${encodeURIComponent(secretName)}`,
        { namespace },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<Record<string, string>>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

export const getMaaSModels =
  (hostPath: string) =>
  (namespace: string, secretName: string) =>
  (opts: APIOptions): Promise<MaaSModelsResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/maas/models`,
        { namespace, secretName },
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<MaaSModelsResponse>(response)) {
        try {
          return MaaSModelsResponseSchema.parse(response.data);
        } catch {
          throw new Error('Invalid response format');
        }
      }
      throw new Error('Invalid response format');
    });
