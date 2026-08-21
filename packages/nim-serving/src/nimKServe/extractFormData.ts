import type { KServeDeployment } from '@odh-dashboard/kserve/types';
import {
  type ModelLocationData,
  ModelLocationType,
} from '@odh-dashboard/model-serving/shared/types/form-data';
import { getNIMKServeContainerImage } from './fields/nimImageApplyExtract';
import { NIM_IMAGE_REGISTRY } from '../api/images/constants';
import { NIM_RUNTIME_STAMP_ANNOTATION } from '../api/servingruntime/consts';

// NIM containers live under the `nim/` org namespace on the registry (e.g. `nvcr.io/nim/...`).
// Matching the registry host alone would also claim non-NIM images (e.g. `nvcr.io/nvidia/...`).
const NIM_IMAGE_REPOSITORY_PREFIX = `${NIM_IMAGE_REGISTRY}/nim/`;

// Legacy NIM deploys as a plain KServe InferenceService (modelServingPlatformId === KSERVE_ID),
// so it shares KServe's form-data extension. We detect NIM by the nvcr.io/nim/ image on the runtime
// container, falling back to the NIM runtime template annotation for mirror/air-gapped registries
// where the image prefix differs. Either match lets this extension win over KServe's via priority.
export const isNIMKServeDeployment = (deployment: KServeDeployment): boolean =>
  (getNIMKServeContainerImage(deployment)?.startsWith(NIM_IMAGE_REPOSITORY_PREFIX) ?? false) ||
  !!deployment.server?.metadata.annotations?.[NIM_RUNTIME_STAMP_ANNOTATION];

// Only reached when isActive already confirmed this is a NIM deployment, so it always marks NIM.
// The image itself is prefilled by the nimImage wizard-field-extractor, not here.
export const extractNIMKServeModelLocationData = (): ModelLocationData => ({
  type: ModelLocationType.NIM,
  fieldValues: {},
  additionalFields: {},
});
