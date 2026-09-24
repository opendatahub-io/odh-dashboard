import { APIOptions, handleRestFailures, isModArchResponse, restGET } from 'mod-arch-core';
import { createK8sApi } from '@odh-dashboard/autox-core/ui/api';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { MaaSModelsResponse } from '~/app/types';

export const k8sApi = createK8sApi(URL_PREFIX, BFF_API_VERSION);
export const { getUser, getNamespaces } = k8sApi;
import * as z from 'zod';
import type { SecretListItem } from '~/app/types';

const SecretListItemSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  type: z.string().optional(),
  data: z.record(z.string(), z.string()),
  displayName: z.string().optional(),
  description: z.string().optional(),
});

const MaaSModelsResponseSchema = z.object({
  models: z.array(
    z.object({
      id: z.string(),
      display_name: z.string().optional(),
      description: z.string().optional(),
      owned_by: z.string().optional(),
      ready: z.boolean(),
    }),
  ),
});

export const getSecrets =
  (hostPath: string) =>
  (namespace: string, type?: string) =>
  (opts: APIOptions): Promise<SecretListItem[]> =>
    k8sApi.getSecrets(hostPath)(namespace, type)(opts).then((secrets) => {
      try {
        return SecretListItemSchema.array().parse(secrets);
      } catch {
        throw new Error('Invalid response format');
      }
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
        {
          namespace,
          secretName,
        },
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
