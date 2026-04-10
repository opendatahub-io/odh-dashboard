import {
  handleRestFailures,
  isModArchResponse,
  APIOptions,
  restGET,
  restDELETE,
  restCREATE,
  restUPDATE,
  assembleModArchBody,
} from 'mod-arch-core';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';
import {
  CreateSubscriptionRequest,
  CreateSubscriptionResponse,
  MaaSAuthPolicy,
  MaaSModelRefSummary,
  MaaSSubscription,
  ModelRef,
  ModelReference,
  ModelSubscriptionRef,
  OwnerSpec,
  SubjectSpec,
  SubscriptionPolicyFormDataResponse,
  SubscriptionInfoResponse,
  TokenMetadata,
  TokenRateLimit,
  UpdateSubscriptionRequest,
  UserSubscription,
  ModelRefInfo,
  TokenRateLimitInfo,
} from '~/app/types/subscriptions';

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';

const isOptionalString = (v: unknown): v is string | undefined =>
  v === undefined || typeof v === 'string';

const isGroupRef = (v: unknown): v is { name: string } => isRecord(v) && typeof v.name === 'string';

const isTokenRateLimit = (v: unknown): v is TokenRateLimit =>
  isRecord(v) && typeof v.limit === 'number' && typeof v.window === 'string';

const isModelRef = (v: unknown): v is ModelRef =>
  isRecord(v) && typeof v.name === 'string' && typeof v.namespace === 'string';

const isModelReference = (v: unknown): v is ModelReference =>
  isRecord(v) && typeof v.kind === 'string' && typeof v.name === 'string';

// OwnerSpec and SubjectSpec are structurally identical
const isGroupsSpec = (v: unknown): boolean =>
  isRecord(v) && Array.isArray(v.groups) && v.groups.every(isGroupRef);

const isOwnerSpec = (v: unknown): v is OwnerSpec => isGroupsSpec(v);
const isSubjectSpec = (v: unknown): v is SubjectSpec => isGroupsSpec(v);

const isMaaSSubscriptionRef = (v: unknown): v is ModelSubscriptionRef =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  (v.tokenRateLimits == null ||
    (Array.isArray(v.tokenRateLimits) && v.tokenRateLimits.every(isTokenRateLimit))) &&
  (v.billingRate === undefined || typeof v.billingRate === 'object');

const isMaaSSubscription = (v: unknown): v is MaaSSubscription =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  (v.displayName === undefined || typeof v.displayName === 'string') &&
  (v.description === undefined || typeof v.description === 'string') &&
  typeof v.namespace === 'string' &&
  (v.priority === undefined || typeof v.priority === 'number') &&
  isOwnerSpec(v.owner) &&
  Array.isArray(v.modelRefs) &&
  v.modelRefs.every(isMaaSSubscriptionRef) &&
  (v.tokenMetadata === undefined || typeof v.tokenMetadata === 'object') &&
  (v.creationTimestamp === undefined || typeof v.creationTimestamp === 'string');

const isMaaSSubscriptionArray = (v: unknown): v is MaaSSubscription[] =>
  Array.isArray(v) && v.every(isMaaSSubscription);

export const isMaaSModelRefSummary = (v: unknown): v is MaaSModelRefSummary =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  (v.displayName === undefined || typeof v.displayName === 'string') &&
  (v.description === undefined || typeof v.description === 'string') &&
  isModelReference(v.modelRef) &&
  (v.phase === undefined || typeof v.phase === 'string') &&
  (v.endpoint === undefined || typeof v.endpoint === 'string');

const isTokenMetadata = (v: unknown): v is TokenMetadata =>
  isRecord(v) && typeof v.organizationId === 'string' && typeof v.costCenter === 'string';

export const isMaaSAuthPolicy = (v: unknown): v is MaaSAuthPolicy =>
  isRecord(v) &&
  typeof v.name === 'string' &&
  typeof v.namespace === 'string' &&
  isOptionalString(v.displayName) &&
  isOptionalString(v.description) &&
  isOptionalString(v.phase) &&
  isOptionalString(v.creationTimestamp) &&
  Array.isArray(v.modelRefs) &&
  v.modelRefs.every(isModelRef) &&
  isSubjectSpec(v.subjects) &&
  (v.meteringMetadata === undefined || isTokenMetadata(v.meteringMetadata));

/** Coerce null tokenRateLimits (Go nil slice → JSON null) to empty arrays. */
const normalizeSubscription = (sub: MaaSSubscription): MaaSSubscription => ({
  ...sub,
  modelRefs: sub.modelRefs.map((ref) => ({
    ...ref,
    tokenRateLimits: Array.isArray(ref.tokenRateLimits) ? ref.tokenRateLimits : [],
  })),
});

const isDeleteSubscriptionResponse = (v: unknown): v is { message: string } =>
  isRecord(v) && typeof v.message === 'string';

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

const isSubscriptionPolicyFormDataResponse = (
  v: unknown,
): v is SubscriptionPolicyFormDataResponse =>
  isRecord(v) &&
  Array.isArray(v.groups) &&
  v.groups.every((g: unknown) => typeof g === 'string') &&
  Array.isArray(v.modelRefs) &&
  v.modelRefs.every(isMaaSModelRefSummary) &&
  Array.isArray(v.subscriptions) &&
  v.subscriptions.every(isMaaSSubscription) &&
  Array.isArray(v.policies) &&
  v.policies.every(isMaaSAuthPolicy);

const isCreateSubscriptionResponse = (v: unknown): v is CreateSubscriptionResponse =>
  isRecord(v) &&
  isMaaSSubscription(v.subscription) &&
  (v.authPolicy === undefined || isMaaSAuthPolicy(v.authPolicy));

/** GET /api/v1/all-subscriptions - List all subscriptions */
export const listSubscriptions =
  (hostPath = '') =>
  (opts: APIOptions): Promise<MaaSSubscription[]> =>
    handleRestFailures(
      restGET(hostPath, `${URL_PREFIX}/api/${BFF_API_VERSION}/all-subscriptions`, {}, opts),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isMaaSSubscriptionArray(response.data)) {
        return response.data.map(normalizeSubscription);
      }
      throw new Error('Invalid response format');
    });

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
      if (
        isModArchResponse<unknown>(response) &&
        (response.data == null || isDeleteSubscriptionResponse(response.data))
      ) {
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
      if (isModArchResponse<unknown>(response) && isSubscriptionInfoResponse(response.data)) {
        return {
          ...response.data,
          subscription: normalizeSubscription(response.data.subscription),
        };
      }
      throw new Error('Invalid response format');
    });

export const getSubscriptionPolicyFormData =
  (hostPath = '') =>
  (opts: APIOptions): Promise<SubscriptionPolicyFormDataResponse> =>
    handleRestFailures(
      restGET(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/subscription-policy-form-data`,
        {},
        opts,
      ),
    ).then((response) => {
      if (
        isModArchResponse<unknown>(response) &&
        isSubscriptionPolicyFormDataResponse(response.data)
      ) {
        return {
          ...response.data,
          subscriptions: response.data.subscriptions.map(normalizeSubscription),
        };
      }
      throw new Error('Invalid response format');
    });

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
        return {
          ...response.data,
          subscription: normalizeSubscription(response.data.subscription),
        };
      }
      throw new Error('Invalid response format');
    });

export const updateSubscription =
  (hostPath = '') =>
  (
    opts: APIOptions,
    name: string,
    request: UpdateSubscriptionRequest,
  ): Promise<CreateSubscriptionResponse> =>
    handleRestFailures(
      restUPDATE(
        hostPath,
        `${URL_PREFIX}/api/${BFF_API_VERSION}/update-subscription/${encodeURIComponent(name)}`,
        assembleModArchBody(request),
        {},
        opts,
      ),
    ).then((response) => {
      if (isModArchResponse<unknown>(response) && isCreateSubscriptionResponse(response.data)) {
        return {
          ...response.data,
          subscription: normalizeSubscription(response.data.subscription),
        };
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
