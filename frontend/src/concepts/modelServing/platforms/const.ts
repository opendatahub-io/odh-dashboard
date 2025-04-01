export enum SupportedServingPlatform {
  MODEL_MESH = 'MODEL_MESH',
  KSERVE = 'KSERVE',
  // KSERVE_NIM = 'NIM',
}

export const servingPlatformOrder: SupportedServingPlatform[] =
  Object.values(SupportedServingPlatform);
