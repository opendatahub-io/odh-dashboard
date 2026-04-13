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

const MULTI_CLASS_VIEW = 'multi-class';

function getCellStyle(
  rowLabel: string,
  colLabel: string,
  value: number,
  maxValue: number,
): React.CSSProperties {
  const isDiagonal = rowLabel === colLabel;
  const intensity = maxValue > 0 ? value / maxValue : 0;
  const alpha = intensity * 0.6;

  return {
    backgroundColor:
      alpha > 0
        ? isDiagonal
          ? `rgba(56, 142, 60, ${alpha})`
          : `rgba(144, 164, 174, ${alpha})`
        : 'transparent',
    textAlign: 'center',
    fontWeight: isDiagonal ? 600 : 400,
  };
}

/**
 * Collapse an N×N confusion matrix into a 2×2 "One vs Rest" matrix
 * for the given target class. The resulting matrix has labels:
 *   [targetLabel, `Not ${targetLabel}`]
 * with cells: TP, FN, FP, TN.
 */
function computeOneVsRest(
  matrix: ConfusionMatrixData,
  labels: string[],
  targetLabel: string,
): ConfusionMatrixData {
  const getCell = (row: string, col: string): number => matrix[row]?.[col] ?? 0;
  const notLabel = `Not ${targetLabel}`;

  const tp = getCell(targetLabel, targetLabel);
  const fn = labels
    .filter((c) => c !== targetLabel)
    .reduce((sum, c) => sum + getCell(targetLabel, c), 0);
  const fp = labels
    .filter((r) => r !== targetLabel)
    .reduce((sum, r) => sum + getCell(r, targetLabel), 0);
  const tn = labels
    .filter((r) => r !== targetLabel)
    .reduce(
      (sum, r) =>
        sum + labels.filter((c) => c !== targetLabel).reduce((s, c) => s + getCell(r, c), 0),
      0,
    );

  return {
    [targetLabel]: { [targetLabel]: tp, [notLabel]: fn },
    [notLabel]: { [targetLabel]: fp, [notLabel]: tn },
  };
}

const ConfusionMatrixTab: React.FC<TabContentProps> = ({ confusionMatrix, isArtifactsLoading }) => {
  const [selectedView, setSelectedView] = React.useState(MULTI_CLASS_VIEW);
  const [isViewOpen, setIsViewOpen] = React.useState(false);

  if (isArtifactsLoading) {
    return (
      <Table aria-label="Confusion matrix loading" variant="compact">
        <Thead>
          <Tr>
            <Th>Observed</Th>
            <Th textCenter>Class 1</Th>
            <Th textCenter>Class 2</Th>
            <Th textCenter>Percent correct</Th>
          </Tr>
        </Thead>
        <Tbody>
          {Array.from({ length: 3 }, (_, i) => (
            <Tr key={i}>
              <Td>
                <Skeleton width="50%" />
              </Td>
              <Td>
                <Skeleton width="30%" />
              </Td>
              <Td>
                <Skeleton width="30%" />
              </Td>
              <Td>
                <Skeleton width="40%" />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
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
  const showViewSelector = originalLabels.length > 2;

  // Compute the effective matrix based on the selected view
  const effectiveMatrix =
    selectedView !== MULTI_CLASS_VIEW
      ? computeOneVsRest(confusionMatrix, originalLabels, selectedView)
      : confusionMatrix;
  const labels = Object.keys(effectiveMatrix);
  const getCell = (row: string, col: string): number => effectiveMatrix[row]?.[col] ?? 0;

  // Find max value for color scaling
  const allValues = labels.flatMap((row) => labels.map((col) => getCell(row, col)));
  const maxValue = Math.max(...allValues);

  // Compute per-row totals
  const rowTotals = labels.map((row) => labels.reduce((sum, col) => sum + getCell(row, col), 0));

  // Compute per-column totals
  const colTotals = labels.map((col) => labels.reduce((sum, row) => sum + getCell(row, col), 0));

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
              setSelectedView(String(value));
              setIsViewOpen(false);
            }}
            onOpenChange={setIsViewOpen}
            toggle={(toggleRef) => (
              <MenuToggle
                ref={toggleRef}
                onClick={() => setIsViewOpen(!isViewOpen)}
                isExpanded={isViewOpen}
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
      <Table aria-label="Confusion matrix" variant="compact" className="automl-confusion-matrix">
        <Thead>
          <Tr>
            <Th>Observed</Th>
            {labels.map((label) => (
              <Th key={label} textCenter>
                {label}
              </Th>
            ))}
            <Th textCenter>Percent correct</Th>
          </Tr>
        </Thead>
        <Tbody>
          {labels.map((rowLabel, rowIdx) => {
            const rowCorrect = getCell(rowLabel, rowLabel);
            const rowTotal = rowTotals[rowIdx];
            const pct = rowTotal > 0 ? ((rowCorrect / rowTotal) * 100).toFixed(1) : '0.0';

            return (
              <Tr key={rowLabel}>
                <Td dataLabel="Observed">
                  <strong>{rowLabel}</strong>
                </Td>
                {labels.map((colLabel) => {
                  const val = getCell(rowLabel, colLabel);
                  return (
                    <Td
                      key={colLabel}
                      style={getCellStyle(rowLabel, colLabel, val, maxValue)}
                      textCenter
                    >
                      {val}
                    </Td>
                  );
                })}
                <Td textCenter>{pct}%</Td>
              </Tr>
            );
          })}
          <Tr>
            <Td>
              <strong>Percent correct</strong>
            </Td>
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
            {(() => {
              const totalCorrect = labels.reduce((sum, label) => sum + getCell(label, label), 0);
              const total = rowTotals.reduce((sum, t) => sum + t, 0);
              const overallPct =
                total > 0 ? `${((totalCorrect / total) * 100).toFixed(1)}%` : '0.0%';
              return <Td textCenter>{overallPct}</Td>;
            })()}
          </Tr>
        </Tbody>
      </Table>
      <div className="automl-confusion-gradient">
        <span>Less correct</span>
        <span>More correct</span>
      </div>
    </>
  );
};

export default ConfusionMatrixTab;
