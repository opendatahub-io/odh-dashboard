import React from 'react';
import { CodeBlock, CodeBlockCode } from '@patternfly/react-core';
import { Tearsheet, TearsheetBody, TearsheetHeader } from '@patternfly/react-component-groups';
import './ExecutorLogsTearsheet.scss';

export type ExecutorLogsTearsheetProps = {
  /** Full executor log text (stdout/stderr) to display. */
  logText: string;
  isOpen: boolean;
  onClose: () => void;
  /** Label of the step the log belongs to; omit for run-level (first failed step) logs. */
  stepLabel?: string;
};

/**
 * Tearsheet displaying a KFP executor log in a scrollable code block that
 * fills the sheet. Shared by the step details panel ("View logs") and the
 * run-level failure message in the AutoML/AutoRAG leaderboards.
 */
const ExecutorLogsTearsheet: React.FC<ExecutorLogsTearsheetProps> = ({
  logText,
  isOpen,
  onClose,
  stepLabel,
}) => (
  <Tearsheet
    isOpen={isOpen}
    onClose={onClose}
    aria-label={stepLabel ? `Execution logs for ${stepLabel}` : 'Execution logs'}
    data-testid="executor-logs-tearsheet"
  >
    <TearsheetHeader
      title="Execution logs"
      description={
        stepLabel
          ? `Stdout and stderr captured by the KFP executor for the ${stepLabel} step.`
          : 'Stdout and stderr captured by the KFP executor for the first failed step.'
      }
    />
    <TearsheetBody className="autox-executor-logs__body">
      <CodeBlock className="autox-executor-logs__block">
        <CodeBlockCode className="autox-executor-logs__content" data-testid="executor-logs-content">
          {logText}
        </CodeBlockCode>
      </CodeBlock>
    </TearsheetBody>
  </Tearsheet>
);

export default ExecutorLogsTearsheet;
