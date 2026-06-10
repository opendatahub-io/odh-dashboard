export const MODEL_CATALOG_SOURCES_CONFIGMAP = 'model-catalog-sources';
export const MODEL_CATALOG_UNMANAGED_SOURCES_CONFIGMAP = 'model-catalog-unmanaged-sources';

export enum ReservedILabLabel {
  LabBase = 'lab-base',
  LabTeacher = 'lab-teacher',
  LabJudge = 'lab-judge',
}

export const RESERVED_ILAB_LABELS: ReservedILabLabel[] = Object.values(ReservedILabLabel);
