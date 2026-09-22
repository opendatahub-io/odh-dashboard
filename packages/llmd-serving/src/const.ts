// --- Label/Annotation Constants (dashboard-owned, abstracted for easy refactor) ---

export const MAAS_ENDPOINT_LABEL = 'opendatahub.io/maas-endpoint';
export const CONFIG_TYPE_LABEL = 'opendatahub.io/config-type';
export const WELL_KNOWN_ANNOTATION = 'serving.kserve.io/well-known-config';
export const DISABLED_ANNOTATION = 'opendatahub.io/disabled';
export const ROUTING_TYPE_ANNOTATION = 'opendatahub.io/routing-type';
export const SUPPORTED_TOPOLOGIES_ANNOTATION = 'opendatahub.io/supported-topologies';
export const DASHBOARD_RESOURCE_LABEL = 'opendatahub.io/dashboard';
export const TOPOLOGY_TYPE_ANNOTATION = 'opendatahub.io/topology-type';
export const TOPOLOGY_CONFIG_REF_ANNOTATION = 'opendatahub.io/topology-config-ref';
export const ROUTING_CONFIG_REF_ANNOTATION = 'opendatahub.io/routing-config-ref';
export const ACCELERATOR_CONFIG_REF_ANNOTATION = 'opendatahub.io/accelerator-config-ref';
export const VLLM_ADDITIONAL_ARGS = 'VLLM_ADDITIONAL_ARGS';

// --- Wizard field ids (declared here so fields can reference each other without import cycles) ---

export const TOPOLOGY_TYPE_FIELD_ID = 'llmd-serving/topology-type';
export const CUSTOM_TOPOLOGY_CONFIG_FIELD_ID = 'llmd-serving/custom-topology-config';
export const ACCELERATOR_CONFIG_FIELD_ID = 'llmd-serving/accelerator-config';

// Placeholder value persisted when the user keeps the built-in image instead of an accelerator config.
// Uses characters that are invalid in a Kubernetes object name, so it can never collide with a
// real LLMInferenceServiceConfig name. Lives here (not in the field module) so the deploy path can
// reference it without importing React.
export const ACCELERATOR_CONFIG_DEFAULT = '__built-in-image__' as const;
