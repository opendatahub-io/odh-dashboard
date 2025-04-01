export enum SupportedServingPlatform {
  KSERVE = 'KSERVE',
  MODEL_MESH = 'MODEL_MESH',
  // KSERVE_NIM = 'NIM',
}

export const servingPlatformOrder: SupportedServingPlatform[] =
  Object.values(SupportedServingPlatform);
