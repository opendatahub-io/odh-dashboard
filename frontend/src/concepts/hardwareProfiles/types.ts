export type WarningNotification = {
  title: string;
  message: string;
};

export enum HardwareProfileWarningType {
  HARDWARE_PROFILES_MISSING_CPU_MEMORY,
  OTHER,
}
