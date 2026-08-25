export const NIM_OPERATOR_MANAGED_BY = 'k8s-nim-operator';

/** Platform id for the legacy NIM UI (KServe-backed NIM serving). */
export const NIM_LEGACY_ID = 'nvidia-nim';

/** Platform id for NIMService deployments managed by the k8s-nim-operator. */
export const NIM_SERVICE_ID = 'nvidia-nim-service';
export const NIM_MODEL_TYPE = 'NVIDIA NIM';

export const KSERVE_CONTAINER_NAME = 'kserve-container';
export const NIM_CACHE_MOUNT_PATH = '/mnt/models/cache';
export const NIM_CACHE_PATH_ENV = 'NIM_CACHE_PATH';
/** Placeholder PVC volume baked into the NVIDIA NIM ServingRuntime template. */
export const NIM_TEMPLATE_PVC_NAME = 'nim-pvc';
export const DEFAULT_STORAGE_SIZE_GI = 50;
