import {
  handleRestFailures,
  isModArchResponse,
  APIOptions,
  restGET,
  restDELETE,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import {
  MaaSAuthPolicy,
  MaaSModelRefSummary,
  MaaSSubscription,
  ModelRef,
  ModelReference,
  ModelSubscriptionRef,
  SubjectSpec,
  SubscriptionInfoResponse,
  TokenRateLimit,
  UserSubscription,
  ModelRefInfo,
  TokenRateLimitInfo,
} from '~/app/types/subscriptions';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isTokenRateLimit = (v: unknown): v is TokenRateLimit =>
  isRecord(v) && typeof v.limit === 'number' && typeof v.window === 'string';

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
  (v.displayName === undefined || typeof v.displayName === 'string') &&
  (v.description === undefined || typeof v.description === 'string') &&
  typeof v.phase === 'string' &&
  (v.priority === undefined || typeof v.priority === 'number') &&
  typeof v.owner === 'object' &&
  Array.isArray(v.modelRefs) &&
  v.modelRefs.every(isMaaSSubscriptionRef) &&
  (v.tokenMetadata === undefined || typeof v.tokenMetadata === 'object') &&
  (v.creationTimestamp === undefined || typeof v.creationTimestamp === 'string');

const isMaaSSubscriptionArray = (v: unknown): v is MaaSSubscription[] =>
  Array.isArray(v) && v.every(isMaaSSubscription);

const isModelRef = (v: unknown): v is ModelRef =>
  isRecord(v) && typeof v.name === 'string' && typeof v.namespace === 'string';

const isModelReference = (v: unknown): v is ModelReference =>
  isRecord(v) && typeof v.kind === 'string' && typeof v.name === 'string';

const isMaaSModelRefSummary = (v: unknown): v is MaaSModelRefSummary =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  (v.displayName === undefined || typeof v.displayName === 'string') &&
  (v.description === undefined || typeof v.description === 'string') &&
  isModelReference(v.modelRef) &&
  (v.phase === undefined || typeof v.phase === 'string') &&
  (v.endpoint === undefined || typeof v.endpoint === 'string');

const isGroupRef = (v: unknown): v is { name: string } => isRecord(v) && typeof v.name === 'string';

const isSubjectSpec = (v: unknown): v is SubjectSpec =>
  isRecord(v) && Array.isArray(v.groups) && v.groups.every(isGroupRef);

const isMaaSAuthPolicy = (v: unknown): v is MaaSAuthPolicy =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  (v.phase === undefined || typeof v.phase === 'string') &&
  Array.isArray(v.modelRefs) &&
  v.modelRefs.every(isModelRef) &&
  isSubjectSpec(v.subjects);

const isSubscriptionInfoResponse = (v: unknown): v is SubscriptionInfoResponse =>
  isRecord(v) &&
  isMaaSSubscription(v.subscription) &&
  Array.isArray(v.modelRefs) &&
  v.modelRefs.every(isMaaSModelRefSummary) &&
  Array.isArray(v.authPolicies) &&
  v.authPolicies.every(isMaaSAuthPolicy);

const isTokenRateLimitInfo = (v: unknown): v is TokenRateLimitInfo =>
  isRecord(v) && typeof v.limit === 'number' && typeof v.window === 'string';

const isModelRefInfo = (v: unknown): v is ModelRefInfo =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  (v.namespace === undefined || typeof v.namespace === 'string') &&
  (v.token_rate_limits === undefined ||
    (Array.isArray(v.token_rate_limits) && v.token_rate_limits.every(isTokenRateLimitInfo)));

const isUserSubscription = (v: unknown): v is UserSubscription =>
  isRecord(v) &&
  typeof v.subscription_id_header === 'string' &&
  typeof v.subscription_description === 'string' &&
  typeof v.priority === 'number' &&
  Array.isArray(v.model_refs) &&
  v.model_refs.every(isModelRefInfo);

const isUserSubscriptionArray = (v: unknown): v is UserSubscription[] =>
  Array.isArray(v) && v.every(isUserSubscription);
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

export const getSubscriptionInfo =
  (name: string, hostPath = '') =>
  (opts: APIOptions): Promise<SubscriptionInfoResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/subscription-info/${encodeURIComponent(name)}`,
        {},
        opts,
      ),
    ).then((response) => {
      if (isSubscriptionInfoResponse(response)) {
        return response;
      }
      throw new Error('Invalid response format');
    });

export const listUserSubscriptions =
  (hostPath = '') =>
  (opts: APIOptions): Promise<UserSubscription[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/subscriptions`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isUserSubscriptionArray(response.data)) {
        return response.data;
      }
      throw new Error('Invalid response format');
    });
