export const DATASET_SPLIT_AUTO = 'auto';
export const DATASET_SPLIT_SEPARATE = 'separate';

export const DATASET_SPLIT_MODES = [DATASET_SPLIT_AUTO, DATASET_SPLIT_SEPARATE] as const;

export type DatasetSplitMode = (typeof DATASET_SPLIT_MODES)[number];
