import {
  handleRestFailures,
  isModArchResponse,
  assembleModArchBody,
  APIOptions,
  restGET,
  restCREATE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '../utilities/const';
import {
  MaaSSubscription,
  MaaSModelRefSummary,
  ModelSubscriptionRef,
  TokenRateLimit,
  SubscriptionFormDataResponse,
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
} from '../types/subscriptions';

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
  (v.displayName === undefined || typeof v.displayName === 'string') &&
  (v.description === undefined || typeof v.description === 'string') &&
  typeof v.namespace === 'string' &&
  (v.phase === undefined || typeof v.phase === 'string') &&
  (v.priority === undefined || typeof v.priority === 'number') &&
  isRecord(v.owner) &&
  Array.isArray(v.modelRefs) &&
  v.modelRefs.every(isMaaSSubscriptionRef) &&
  (v.tokenMetadata === undefined || isRecord(v.tokenMetadata)) &&
  (v.creationTimestamp === undefined || typeof v.creationTimestamp === 'string');

const isTokenRateLimit = (v: unknown): v is TokenRateLimit =>
  isRecord(v) && typeof v.limit === 'number' && typeof v.window === 'string';

const isMaaSSubscriptionArray = (v: unknown): v is MaaSSubscription[] =>
  Array.isArray(v) && v.every(isMaaSSubscription);

const isMaaSModelRefSummary = (v: unknown): v is MaaSModelRefSummary =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  isRecord(v.modelRef) &&
  typeof v.modelRef.kind === 'string' &&
  typeof v.modelRef.name === 'string';

const isSubscriptionFormDataResponse = (v: unknown): v is SubscriptionFormDataResponse =>
  isRecord(v) &&
  Array.isArray(v.groups) &&
  v.groups.every((g: unknown) => typeof g === 'string') &&
  Array.isArray(v.modelRefs) &&
  v.modelRefs.every(isMaaSModelRefSummary) &&
  Array.isArray(v.subscriptions) &&
  v.subscriptions.every(isMaaSSubscription);

const isCreateSubscriptionResponse = (v: unknown): v is CreateSubscriptionResponse =>
  isRecord(v) && isRecord(v.subscription) && typeof v.subscription.name === 'string';

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

/** GET /api/v1/new-subscription - Get subscription creation form data */
export const getSubscriptionFormData =
  (hostPath = '') =>
  (opts: APIOptions): Promise<SubscriptionFormDataResponse> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/new-subscription`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isSubscriptionFormDataResponse(response.data)) {
        return response.data;
      }
      throw new Error('Invalid subscription form data response');
    });

/** POST /api/v1/new-subscription - Create a new subscription */
export const createSubscription =
  (hostPath = '') =>
  (opts: APIOptions, request: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse> =>
    handleRestFailures(
      restCREATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/new-subscription`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isCreateSubscriptionResponse(response.data)) {
        return response.data;
      }
      throw new Error('Invalid create subscription response');
    });
