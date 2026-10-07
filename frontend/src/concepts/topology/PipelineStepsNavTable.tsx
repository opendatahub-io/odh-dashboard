import React from 'react';
import { Button, ExpandableSection, Flex, FlexItem, Switch } from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { RunStatus } from '@patternfly/react-topology';
import { css } from '@patternfly/react-styles';
import {
  AccessibleStep,
  buildAccessibleStepList,
  formatFailureSummary,
  hasFailedOrCancelledSteps,
  isActionableFailureStatus,
} from './accessibleSteps';
import { PipelineStepsNavProps } from './pipelineStepsNavTypes';

/**
 * Table-based steps navigation (earlier HTML-first experiment).
 * Expandable section with Step | Status | View details rows.
 */
const PipelineStepsNavTable: React.FC<PipelineStepsNavProps> = ({ nodes, onNodeSelect }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const steps = React.useMemo(() => buildAccessibleStepList(nodes), [nodes]);
  const hasFailures = React.useMemo(() => hasFailedOrCancelledSteps(steps), [steps]);
  const [showFailuresOnly, setShowFailuresOnly] = React.useState(hasFailures);
  const prevHasFailuresRef = React.useRef(false);
  const initializedPanelRef = React.useRef(false);

  // Set initial expand state once, and auto-expand when failures first appear.
  // Do not re-sync on every poll — that collapses the panel while the user is reading it.
  React.useEffect(() => {
    if (!initializedPanelRef.current) {
      initializedPanelRef.current = true;
      if (hasFailures) {
        setIsExpanded(true);
        setShowFailuresOnly(true);
      }
      prevHasFailuresRef.current = hasFailures;
      return;
    }
    if (hasFailures && !prevHasFailuresRef.current) {
      setIsExpanded(true);
      setShowFailuresOnly(true);
    }
    prevHasFailuresRef.current = hasFailures;
  }, [hasFailures]);

  const visibleSteps = React.useMemo(
    () =>
      showFailuresOnly ? steps.filter((step) => isActionableFailureStatus(step.status)) : steps,
    [showFailuresOnly, steps],
  );

  if (steps.length === 0) {
    return null;
  }

  const failureCount = steps.filter((step) => isActionableFailureStatus(step.status)).length;
  const failureSummary = formatFailureSummary(steps);
  const toggleText =
    failureCount > 0
      ? `Pipeline steps (${steps.length}) — ${failureSummary}`
      : `Pipeline steps (${steps.length})`;

  return (
    <div className="pipeline-run-steps-panel">
      <ExpandableSection
        toggleText={toggleText}
        onToggle={(_event, expanded) => setIsExpanded(expanded)}
        isExpanded={isExpanded}
        displaySize="lg"
        data-testid="pipeline-run-steps-panel"
      >
        <Flex
          direction={{ default: 'column' }}
          spaceItems={{ default: 'spaceItemsSm' }}
          className="pipeline-run-steps-panel__content"
        >
          {hasFailures ? (
            <FlexItem>
              <Switch
                id="pipeline-steps-failures-only"
                label="Show failed and canceled steps only"
                isChecked={showFailuresOnly}
                onChange={(_event, checked) => setShowFailuresOnly(checked)}
                data-testid="pipeline-steps-failures-filter"
              />
            </FlexItem>
          ) : null}
          <FlexItem>
            <div className="pipeline-run-steps-panel__scroll">
              <Table
                variant="compact"
                aria-label="Pipeline run steps"
                data-testid="pipeline-run-steps-table"
              >
                <Thead>
                  <Tr>
                    <Th>Step</Th>
                    <Th>Status</Th>
                    <Th screenReaderText="Actions">Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {visibleSteps.map((step) => (
                    <PipelineRunStepRow key={step.id} step={step} onNodeSelect={onNodeSelect} />
                  ))}
                </Tbody>
              </Table>
              {visibleSteps.length === 0 ? (
                <p className="pipeline-run-steps-panel__empty">No failed or canceled steps.</p>
              ) : null}
            </div>
          </FlexItem>
        </Flex>
      </ExpandableSection>
    </div>
  );
};

type PipelineRunStepRowProps = {
  step: AccessibleStep;
  onNodeSelect: (id: string) => void;
};

const PipelineRunStepRow: React.FC<PipelineRunStepRowProps> = ({ step, onNodeSelect }) => (
  <Tr
    className={css(
      step.status === RunStatus.Failed && 'pipeline-run-steps-panel__row--failed',
      step.status === RunStatus.Cancelled && 'pipeline-run-steps-panel__row--cancelled',
    )}
    data-testid={`pipeline-step-row-${step.id}`}
  >
    <Td dataLabel="Step">{step.label}</Td>
    <Td dataLabel="Status">{step.statusLabel}</Td>
    <Td dataLabel="Actions">
      <Button
        variant="link"
        isInline
        onClick={() => onNodeSelect(step.id)}
        data-testid={`pipeline-step-view-${step.id}`}
      >
        View details
      </Button>
    </Td>
  </Tr>
);

export default PipelineStepsNavTable;
