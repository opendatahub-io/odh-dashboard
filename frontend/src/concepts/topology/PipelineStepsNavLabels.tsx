import React from 'react';
import { Button, ExpandableSection, Flex, FlexItem, Switch } from '@patternfly/react-core';
import {
  buildAccessibleStepList,
  formatFailureSummary,
  hasFailedOrCancelledSteps,
  isActionableFailureStatus,
} from './accessibleSteps';
import PipelineStepList from './PipelineStepList';
import { PipelineStepsNavProps } from './pipelineStepsNavTypes';

/**
 * Label-pill steps navigation (current default).
 * Expandable section with compact status labels and a collapsed failure strip.
 */
const PipelineStepsNavLabels: React.FC<PipelineStepsNavProps> = ({ nodes, onNodeSelect }) => {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const steps = React.useMemo(() => buildAccessibleStepList(nodes), [nodes]);
  const hasFailures = React.useMemo(() => hasFailedOrCancelledSteps(steps), [steps]);
  const failureSteps = React.useMemo(
    () => steps.filter((step) => isActionableFailureStatus(step.status)),
    [steps],
  );
  const [showFailuresOnly, setShowFailuresOnly] = React.useState(hasFailures);
  const prevHasFailuresRef = React.useRef(false);
  const initializedPanelRef = React.useRef(false);
  const expandedListHeadingId = React.useId();
  const collapsedListHeadingId = React.useId();

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

  const handleShowAllSteps = React.useCallback(() => {
    setIsExpanded(true);
    window.requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const firstFailed = panelRef.current?.querySelector<HTMLElement>(
        '[data-testid^="pipeline-step-label-"][data-failure="true"]',
      );
      const focusTarget =
        firstFailed ??
        panelRef.current?.querySelector<HTMLElement>('[data-testid^="pipeline-step-label-"]');
      focusTarget?.focus();
    });
  }, []);

  if (steps.length === 0) {
    return null;
  }

  const failureCount = failureSteps.length;
  const failureSummary = formatFailureSummary(steps);
  const toggleText =
    failureCount > 0
      ? `Pipeline steps (${steps.length}) — ${failureSummary}`
      : `Pipeline steps (${steps.length})`;

  return (
    <div ref={panelRef} className="pipeline-run-steps-panel">
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
              <PipelineStepList
                steps={visibleSteps}
                headingId={expandedListHeadingId}
                headingText="Pipeline steps"
                onStepSelect={onNodeSelect}
              />
              {visibleSteps.length === 0 ? (
                <p className="pipeline-run-steps-panel__empty">No failed or canceled steps.</p>
              ) : null}
            </div>
          </FlexItem>
        </Flex>
      </ExpandableSection>
      {!isExpanded && failureCount > 0 ? (
        <Flex
          spaceItems={{ default: 'spaceItemsSm' }}
          alignItems={{ default: 'alignItemsCenter' }}
          className="pipeline-run-steps-panel__collapsed-strip"
        >
          <FlexItem>
            <PipelineStepList
              steps={failureSteps}
              headingId={collapsedListHeadingId}
              headingText="Failed pipeline steps"
              onStepSelect={onNodeSelect}
            />
          </FlexItem>
          <FlexItem>
            <Button
              variant="link"
              isInline
              onClick={handleShowAllSteps}
              data-testid="pipeline-show-all-steps"
            >
              View all steps
            </Button>
          </FlexItem>
        </Flex>
      ) : null}
    </div>
  );
};

export default PipelineStepsNavLabels;
