export type ConfusionMatrixInput = {
  annotationSpecs: {
    displayName: string;
  }[];
  rows: { row: number[] }[];
};

export interface ConfusionMatrixConfig {
  data: number[][];
  labels: string[];
}
