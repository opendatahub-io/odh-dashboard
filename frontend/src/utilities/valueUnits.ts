// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting from ui-core for backward compatibility
export {
  splitValueUnit,
  convertToUnit,
  isEqual,
  isCpuResourceEqual,
  isMemoryResourceEqual,
  isLarger,
  isCpuLarger,
  isCpuLimitLarger,
  isMemoryLarger,
  isMemoryLimitLarger,
  formatMemory,
  CPU_UNITS,
  MEMORY_UNITS_FOR_SELECTION,
  MEMORY_UNITS_FOR_PARSING,
  OTHER,
} from '@odh-dashboard/ui-core';
export type { ValueUnitString, ValueUnitCPU, UnitOption } from '@odh-dashboard/ui-core';
