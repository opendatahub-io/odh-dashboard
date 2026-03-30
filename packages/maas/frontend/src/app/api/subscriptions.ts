import {
  handleRestFailures,
  isModArchResponse,
  APIOptions,
  restGET,
  restDELETE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import { MaaSSubscription, ModelSubscriptionRef, TokenRateLimit } from '~/app/types/subscriptions';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isMaaSSubscriptionRef = (v: unknown): v is ModelSubscriptionRef =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  (v.tokenRateLimits === undefined ||
    (Array.isArray(v.tokenRateLimits) && v.tokenRateLimits.every(isTokenRateLimit))) &&
  (v.tokenRateLimitRef === undefined || typeof v.tokenRateLimitRef === 'string') &&
  (v.billingRate === undefined || typeof v.billingRate === 'object');

const isMaaSSubscription = (v: unknown): v is MaaSSubscription =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  (v.phase === undefined || typeof v.phase === 'string') &&
  (v.priority === undefined || typeof v.priority === 'number') &&
  typeof v.owner === 'object' &&
  Array.isArray(v.modelRefs) &&
  v.modelRefs.every(isMaaSSubscriptionRef) &&
  (v.tokenMetadata === undefined || typeof v.tokenMetadata === 'object') &&
  (v.creationTimestamp === undefined || typeof v.creationTimestamp === 'string');
const isTokenRateLimit = (v: unknown): v is TokenRateLimit =>
  isRecord(v) && typeof v.limit === 'number' && typeof v.window === 'string';

const isMaaSSubscriptionArray = (v: unknown): v is MaaSSubscription[] =>
  Array.isArray(v) && v.every(isMaaSSubscription);

/** GET /api/v1/all-subscriptions - List all subscriptions */
export const listSubscriptions =
  (hostPath = '') =>
  (opts: APIOptions): Promise<MaaSSubscription[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/all-subscriptions`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isMaaSSubscriptionArray(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });

const isDeleteSubscriptionResponse = (v: unknown): v is { message: string } =>
  isRecord(v) && typeof v.message === 'string';

export const deleteSubscription =
  (hostPath = '') =>
  (opts: APIOptions, name: string): Promise<void> =>
    handleRestFailures(
      restDELETE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/subscription/${encodeURIComponent(name)}`,
        {},
        {},
        opts,
      ),
    ).then((response) => {
      if (isDeleteSubscriptionResponse(response)) {
        return;
      }
      throw new Error('Invalid response format');
    });
