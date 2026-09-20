import * as React from 'react';
import {
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  ClipboardCopyButton,
  ExpandableSection,
} from '@patternfly/react-core';
import { convertStatusDetailsToJson } from '~/app/utilities/phaseLabelUtils';

type PhaseApiDetailsProps = {
  reason?: string;
  statusMessage?: string;
  status?: string;
  conditionType?: string;
  lastTransitionTime?: string;
};

const PhaseApiDetails: React.FC<PhaseApiDetailsProps> = ({
  reason,
  statusMessage,
  status,
  conditionType,
  lastTransitionTime,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const clipboardCopyFunc = (text: string) => {
    navigator.clipboard.writeText(text.toString());
  };

  const onClick = (text: string) => {
    clipboardCopyFunc(text);
    setCopied(true);
  };

  const json = convertStatusDetailsToJson(
    reason,
    statusMessage,
    status,
    conditionType,
    lastTransitionTime,
  );

  const detailsActions = (
    <CodeBlockAction>
      <ClipboardCopyButton
        id="status-details-copy-button"
        aria-label="Copy to clipboard status details"
        onClick={() => onClick(json)}
        exitDelay={copied ? 1500 : 600}
        maxWidth="110px"
        variant="plain"
        onTooltipHidden={() => setCopied(false)}
      >
        {copied ? 'Successfully copied to clipboard!' : 'Copy to clipboard'}
      </ClipboardCopyButton>
    </CodeBlockAction>
  );

  return (
    <ExpandableSection
      toggleText={isExpanded ? 'Hide API details' : 'API details'}
      isExpanded={isExpanded}
      onToggle={(_event, expanded) => setIsExpanded(expanded)}
      data-testid="phase-api-details"
    >
      <CodeBlock actions={detailsActions}>
        <CodeBlockCode data-testid="phase-api-details-code-block">{json}</CodeBlockCode>
      </CodeBlock>
    </ExpandableSection>
  );
};

export default PhaseApiDetails;
