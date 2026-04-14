import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  FormGroup,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Skeleton,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { ConfusionMatrixData } from '~/app/types';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import { TASK_TYPE_MULTICLASS } from '~/app/utilities/const';

const MULTI_CLASS_VIEW = 'multi-class';

function getCellClassName(rowLabel: string, colLabel: string): string {
  const isDiagonal = rowLabel === colLabel;
  return isDiagonal
    ? 'automl-confusion-matrix__cell--diagonal'
    : 'automl-confusion-matrix__cell--off-diagonal';
}

function getCellIntensityClass(value: number, maxValue: number): string {
  if (maxValue <= 0 || value <= 0) {
    return '';
  }
  const intensity = value / maxValue;
  if (intensity > 0.66) {
    return 'm-intensity-high';
  }
  if (intensity > 0.33) {
    return 'm-intensity-medium';
  }
  return 'm-intensity-low';
}

/**
 * Collapse an N×N confusion matrix into a 2×2 "One vs Rest" matrix
 * for the given target class. The resulting matrix has labels:
 *   [targetLabel, `Not ${targetLabel}`]
 * with cells: TP, FN, FP, TN.
 */
export function computeOneVsRest(
  matrix: ConfusionMatrixData,
  labels: string[],
  targetLabel: string,
): ConfusionMatrixData {
  const getCell = (row: string, col: string): number => matrix[row]?.[col] ?? 0;
  const notLabel = `Not ${targetLabel}`;

  const otherLabels = labels.filter((l) => l !== targetLabel);
  const truePositive = getCell(targetLabel, targetLabel);
  const falseNegative = otherLabels.reduce((sum, c) => sum + getCell(targetLabel, c), 0);
  const falsePositive = otherLabels.reduce((sum, r) => sum + getCell(r, targetLabel), 0);
  const trueNegative = otherLabels.reduce(
    (sum, r) => sum + otherLabels.reduce((s, c) => s + getCell(r, c), 0),
    0,
  );

  return {
    [targetLabel]: { [targetLabel]: truePositive, [notLabel]: falseNegative },
    [notLabel]: { [targetLabel]: falsePositive, [notLabel]: trueNegative },
  };
}

const ConfusionMatrixTab: React.FC<TabContentProps> = ({
  confusionMatrix,
  isArtifactsLoading,
  taskType,
}) => {
  const [selectedView, setSelectedView] = React.useState(MULTI_CLASS_VIEW);
  const [isViewOpen, setIsViewOpen] = React.useState(false);

  const effectiveMatrix = React.useMemo(() => {
    if (!confusionMatrix || selectedView === MULTI_CLASS_VIEW) {
      return confusionMatrix;
    }
    return computeOneVsRest(confusionMatrix, Object.keys(confusionMatrix), selectedView);
  }, [selectedView, confusionMatrix]);

  if (isArtifactsLoading) {
    return (
      <>
        {taskType === TASK_TYPE_MULTICLASS && (
          <FormGroup
            label="View"
            fieldId="confusion-matrix-view-loading"
            className="automl-confusion-matrix-view"
          >
            <MenuToggle isDisabled aria-label="Loading view selector">
              {selectedView === MULTI_CLASS_VIEW ? 'Multi-class' : `${selectedView} (One v. Rest)`}
            </MenuToggle>
          </FormGroup>
        )}
        <Table
          aria-label="Confusion matrix loading"
          variant="compact"
          className="automl-confusion-matrix m-loading"
          gridBreakPoint=""
          data-testid="confusion-matrix-loading"
        >
          <Thead>
            <Tr>
              <Th rowSpan={2}>Observed</Th>
              <Th colSpan={3} textCenter>
                Predicted
              </Th>
              <Th rowSpan={2} textCenter>
                Percent correct
              </Th>
            </Tr>
            <Tr>
              {Array.from({ length: 3 }, (_, i) => (
                <Th key={i} textCenter>
                  <Skeleton screenreaderText="Loading column label" />
                </Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {Array.from({ length: 3 }, (_, i) => (
              <Tr key={i}>
                <Th>
                  <Skeleton screenreaderText="Loading row label" />
                </Th>
                {Array.from({ length: 3 }, (_v, j) => (
                  <Td key={j} textCenter>
                    <Skeleton screenreaderText="Loading cell value" />
                  </Td>
                ))}
                <Td textCenter>
                  <Skeleton screenreaderText="Loading percentage" />
                </Td>
              </Tr>
            ))}
            <Tr>
              <Th>Percent correct</Th>
              {Array.from({ length: 3 }, (_, i) => (
                <Td key={i} textCenter>
                  <Skeleton screenreaderText="Loading column percentage" />
                </Td>
              ))}
              <Td textCenter>
                <Skeleton screenreaderText="Loading overall percentage" />
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </>
    );
  }

  if (!confusionMatrix || Object.keys(confusionMatrix).length === 0) {
    return (
      <Bullseye>
        <EmptyState
          variant={EmptyStateVariant.sm}
          titleText="No confusion matrix data available"
          data-testid="confusion-matrix-no-data-empty-state"
        >
          <EmptyStateBody>Confusion matrix data is not available for this model.</EmptyStateBody>
        </EmptyState>
      </Bullseye>
    );
  }

  const originalLabels = Object.keys(confusionMatrix);
  const showViewSelector = taskType === TASK_TYPE_MULTICLASS && originalLabels.length > 2;

  // effectiveMatrix is always defined here: the useMemo returns confusionMatrix
  // (guaranteed non-null past the guard above) or the computeOneVsRest result.
  // The ?? fallback satisfies TypeScript without a non-null assertion.
  const matrix = effectiveMatrix ?? confusionMatrix;
  const labels = Object.keys(matrix);
  const getCell = (row: string, col: string): number => matrix[row]?.[col] ?? 0;

  // Find max value for color scaling
  const allValues = labels.flatMap((row) => labels.map((col) => getCell(row, col)));
  const maxValue = Math.max(...allValues);

  // Compute per-row totals
  const rowTotals = labels.map((row) => labels.reduce((sum, col) => sum + getCell(row, col), 0));

  // Compute per-column totals
  const colTotals = labels.map((col) => labels.reduce((sum, row) => sum + getCell(row, col), 0));

  // Overall accuracy
  const totalCorrect = labels.reduce((sum, label) => sum + getCell(label, label), 0);
  const grandTotal = rowTotals.reduce((sum, t) => sum + t, 0);
  const overallPct = grandTotal > 0 ? ((totalCorrect / grandTotal) * 100).toFixed(1) : '0.0';

  return (
    <>
      {showViewSelector && (
        <FormGroup
          label="View"
          fieldId="confusion-matrix-view"
          className="automl-confusion-matrix-view"
        >
          <Select
            id="confusion-matrix-view"
            isOpen={isViewOpen}
            selected={selectedView}
            onSelect={(_e, value) => {
              setSelectedView(typeof value === 'string' ? value : MULTI_CLASS_VIEW);
              setIsViewOpen(false);
            }}
            onOpenChange={setIsViewOpen}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsViewOpen(!isViewOpen)}
                isExpanded={isViewOpen}
                aria-label="Select confusion matrix view"
                data-testid="confusion-matrix-view-toggle"
              >
                {selectedView === MULTI_CLASS_VIEW
                  ? 'Multi-class'
                  : `${selectedView} (One v. Rest)`}
              </MenuToggle>
            )}
            shouldFocusToggleOnSelect
            data-testid="confusion-matrix-view-select"
          >
            <SelectList>
              <SelectOption value={MULTI_CLASS_VIEW}>Multi-class</SelectOption>
              {originalLabels.map((label) => (
                <SelectOption key={label} value={label}>
                  {label} (One v. Rest)
                </SelectOption>
              ))}
            </SelectList>
          </Select>
        </FormGroup>
      )}
      <Table
        aria-label="Confusion matrix"
        variant="compact"
        className="automl-confusion-matrix"
        gridBreakPoint=""
        data-testid="confusion-matrix-table"
      >
        <Thead>
          <Tr>
            <Th rowSpan={2}>Observed</Th>
            <Th colSpan={labels.length} textCenter>
              Predicted
            </Th>
            <Th rowSpan={2} textCenter>
              Percent correct
            </Th>
          </Tr>
          <Tr>
            {labels.map((label) => (
              <Th key={label} textCenter>
                {label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {labels.map((rowLabel, rowIdx) => {
            const rowCorrect = getCell(rowLabel, rowLabel);
            const rowTotal = rowTotals[rowIdx];
            const pct = rowTotal > 0 ? ((rowCorrect / rowTotal) * 100).toFixed(1) : '0.0';

            return (
              <Tr key={rowLabel}>
                <Th dataLabel="Observed">{rowLabel}</Th>
                {labels.map((colLabel) => {
                  const val = getCell(rowLabel, colLabel);
                  const cellClass = [
                    getCellClassName(rowLabel, colLabel),
                    getCellIntensityClass(val, maxValue),
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <Td key={colLabel} className={cellClass} textCenter>
                      {val}
                    </Td>
                  );
                })}
                <Td textCenter>{pct}%</Td>
              </Tr>
            );
          })}
          <Tr>
            <Th>Percent correct</Th>
            {labels.map((colLabel, colIdx) => {
              const colCorrect = getCell(colLabel, colLabel);
              const colTotal = colTotals[colIdx];
              const pct = colTotal > 0 ? ((colCorrect / colTotal) * 100).toFixed(1) : '0.0';
              return (
                <Td key={colLabel} textCenter>
                  {pct}%
                </Td>
              );
            })}
            <Td textCenter>{overallPct}%</Td>
          </Tr>
        </Tbody>
      </Table>
      <div className="automl-confusion-gradient" data-testid="confusion-matrix-gradient">
        <span>Less correct</span>
        <span>More correct</span>
      </div>
    </>
  );
};

export default ConfusionMatrixTab;
