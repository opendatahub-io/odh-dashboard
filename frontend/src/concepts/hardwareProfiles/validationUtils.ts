// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting from hardware-profiles for backward compatibility
export {
  ValidationErrorCodes,
  createCpuSchema,
  createMemorySchema,
  createNumericSchema,
  hardwareProfileValidationSchema,
  isHardwareProfileConfigValid,
} from '@odh-dashboard/hardware-profiles-shared';
export type { ResourceSchema } from '@odh-dashboard/hardware-profiles-shared';
