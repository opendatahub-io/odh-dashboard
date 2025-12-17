import {
  APIOptions,
  handleRestFailures,
  isModArchResponse,
  restGET,
  restCREATE,
  restPATCH,
  restDELETE,
  assembleModArchBody,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { type Tier } from '~/app/types/tier';

/** GET /api/v1/tiers - Fetch the list of tiers */
export const getTiers =
  (hostPath = '') =>
  (opts: APIOptions): Promise<Tier[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/tiers`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<Tier[]>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** GET /api/v1/tier/:name - Fetch the data of a specific tier */
export const getTier =
  (hostPath = '') =>
  (opts: APIOptions, tierName: string): Promise<Tier> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/tier/${tierName}`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<Tier>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** POST /api/v1/tier - Create a tier */
export const createTier =
  (hostPath = '') =>
  (opts: APIOptions, tier: Tier): Promise<void> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/tier`,
        assembleModArchBody(tier),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<void>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** PUT /api/v1/tier/:name - Update a tier */
export const updateTier =
  (hostPath = '') =>
  (opts: APIOptions, tierName: string, tier: Tier): Promise<void> =>
    handleRestFailures(
      restPATCH(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/tier/${tierName}`,
        assembleModArchBody(tier),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<void>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

/** DELETE /api/v1/tier/:name - Delete a tier */
export const deleteTier =
  (hostPath = '') =>
  (opts: APIOptions, tierName: string): Promise<void> =>
    handleRestFailures(
      restDELETE(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/tier/${tierName}`, {}, {}, opts),
    ).then((response) => {
      if (isModArchResponse<void>(response)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
