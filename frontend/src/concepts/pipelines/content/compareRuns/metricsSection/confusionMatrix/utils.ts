import { ConfusionMatrixInput } from '#~/concepts/pipelines/content/artifacts/charts/confusionMatrix/types';

export const isConfusionMatrix = (obj: unknown): obj is ConfusionMatrixInput => {
  const matrix = obj;
  return (
    typeof matrix === 'object' &&
    matrix !== null &&
    'annotationSpecs' in matrix &&
    'rows' in matrix &&
    Array.isArray(matrix.annotationSpecs) &&
    matrix.annotationSpecs.every(
      (annotationSpec) =>
        !!annotationSpec.displayName && typeof annotationSpec.displayName === 'string',
    ) &&
    Array.isArray(matrix.rows) &&
    matrix.rows.every(
      (row) =>
        Array.isArray(row.row) && row.row.every((value: unknown) => typeof value === 'number'),
    )
  );
};
