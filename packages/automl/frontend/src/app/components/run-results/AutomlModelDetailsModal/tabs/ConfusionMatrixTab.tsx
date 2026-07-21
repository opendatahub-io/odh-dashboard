import React from 'react';
import {
  Bullseye,
  Content,
  ContentVariants,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  FormGroup,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Skeleton,
  Truncate,
} from '@patternfly/react-core';
import { InnerScrollContainer, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { ConfusionMatrixData } from '~/app/types';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import { TASK_TYPE_MULTICLASS } from '~/app/utilities/const';

const MULTI_CLASS_VIEW = 'multi-class';

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

const formatPct = (correct: number, total: number): string =>
  total > 0 ? `${((correct / total) * 100).toFixed(1)}%` : '0.0%';

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
        <Flex
          alignItems={{ default: 'alignItemsFlexEnd' }}
          spaceItems={{ default: 'spaceItemsLg' }}
          className="pf-v6-u-mb-md"
        >
          {taskType === TASK_TYPE_MULTICLASS && (
            <FlexItem>
              <FormGroup label="View" fieldId="confusion-matrix-view-loading">
                <MenuToggle
                  isDisabled
                  aria-label="Loading view selector"
                  className="automl-confusion-matrix__view-toggle"
                >
                  {selectedView === MULTI_CLASS_VIEW
                    ? 'Multi-class'
                    : `${selectedView} (One v. Rest)`}
                </MenuToggle>
              </FormGroup>
            </FlexItem>
          )}
          <FlexItem>
            <div
              className="automl-confusion-matrix__stat-box"
              data-testid="confusion-matrix-accuracy"
            >
              <Content component={ContentVariants.small}>Overall accuracy</Content>
              <Skeleton width="60px" screenreaderText="Loading accuracy" />
            </div>
          </FlexItem>
        </Flex>
        <div className="automl-confusion-matrix__outer">
          <div className="automl-confusion-matrix__predicted-header">PREDICTED CLASS</div>
          <div className="automl-confusion-matrix__body">
            <div className="automl-confusion-matrix__actual-class-label">ACTUAL CLASS</div>
            <Table
              aria-label="Confusion matrix loading"
              variant="compact"
              className="automl-confusion-matrix m-loading"
              gridBreakPoint=""
              data-testid="confusion-matrix-loading"
            >
              <Thead>
                <Tr>
                  <Th screenReaderText="Class" />
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
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>
        </div>
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

  const matrix = effectiveMatrix ?? confusionMatrix;
  const labels = Object.keys(matrix);
  const getCell = (row: string, col: string): number => matrix[row]?.[col] ?? 0;

  const rowTotals = labels.map((row) => labels.reduce((sum, col) => sum + getCell(row, col), 0));
  const colTotals = labels.map((col) => labels.reduce((sum, row) => sum + getCell(row, col), 0));

  const totalCorrect = labels.reduce((sum, label) => sum + getCell(label, label), 0);
  const grandTotal = rowTotals.reduce((sum, t) => sum + t, 0);
  const overallAccuracy = formatPct(totalCorrect, grandTotal);

  return (
    <>
      <Flex
        alignItems={{ default: 'alignItemsFlexEnd' }}
        spaceItems={{ default: 'spaceItemsLg' }}
        className="pf-v6-u-mb-md"
      >
        {showViewSelector && (
          <FlexItem>
            <FormGroup label="View" fieldId="confusion-matrix-view">
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
                    className="automl-confusion-matrix__view-toggle"
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
          </FlexItem>
        )}
        <FlexItem>
          <div
            className="automl-confusion-matrix__stat-box"
            data-testid="confusion-matrix-accuracy"
          >
            <Content component={ContentVariants.small}>Overall accuracy</Content>
            <Content component="p" className="automl-confusion-matrix__stat-value">
              {overallAccuracy}
            </Content>
          </div>
        </FlexItem>
      </Flex>
      <div className="automl-confusion-matrix__outer">
        <div className="automl-confusion-matrix__predicted-header">PREDICTED CLASS</div>
        <div className="automl-confusion-matrix__body">
          <div className="automl-confusion-matrix__actual-class-label">ACTUAL CLASS</div>
          <InnerScrollContainer>
            <Table
              aria-label="Confusion matrix"
              variant="compact"
              className="automl-confusion-matrix"
              gridBreakPoint=""
              data-testid="confusion-matrix-table"
            >
              <Thead>
                <Tr>
                  <Th screenReaderText="Class" />
                  {labels.map((label, colIdx) => {
                    const precision = formatPct(getCell(label, label), colTotals[colIdx]);
                    return (
                      <Th key={label} textCenter>
                        <div className="automl-confusion-matrix__header-label">
                          <Truncate content={label} />
                        </div>
                        <div className="automl-confusion-matrix__sub-label">
                          Precision {precision}
                        </div>
                      </Th>
                    );
                  })}
                </Tr>
              </Thead>
              <Tbody>
                {labels.map((rowLabel, rowIdx) => {
                  const recall = formatPct(getCell(rowLabel, rowLabel), rowTotals[rowIdx]);

                  return (
                    <Tr key={rowLabel}>
                      <Th dataLabel="Actual class" textCenter>
                        <div className="automl-confusion-matrix__header-label">
                          <Truncate content={rowLabel} />
                        </div>
                        <div className="automl-confusion-matrix__sub-label">Recall {recall}</div>
                      </Th>
                      {labels.map((colLabel) => {
                        const val = getCell(rowLabel, colLabel);
                        const isCorrect = rowLabel === colLabel;
                        return (
                          <Td
                            key={colLabel}
                            className={
                              isCorrect ? 'automl-confusion-matrix__cell--correct' : undefined
                            }
                            textCenter
                          >
                            {val}
                          </Td>
                        );
                      })}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </InnerScrollContainer>
        </div>
      </div>
      <Flex
        alignItems={{ default: 'alignItemsCenter' }}
        spaceItems={{ default: 'spaceItemsSm' }}
        className="pf-v6-u-mt-md pf-v6-u-font-size-sm pf-v6-u-color-200"
        data-testid="confusion-matrix-legend"
      >
        <span className="automl-confusion-matrix__legend-dot" />
        <span>Correct prediction</span>
      </Flex>
    </>
  );
};

export default ConfusionMatrixTab;
