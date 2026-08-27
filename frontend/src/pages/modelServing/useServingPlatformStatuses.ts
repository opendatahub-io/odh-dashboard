// Re-export shim. The implementation now lives in the model-serving package
// (packages/model-serving/src/hooks/useServingPlatformStatuses.ts) per the host-api
// decoupling plan (RHOAIENG-79894). This shim keeps existing frontend consumers and
// their mocks working while the domain hook is owned by model-serving.
export { default } from '@odh-dashboard/model-serving/hooks/useServingPlatformStatuses';
