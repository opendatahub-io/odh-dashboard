import React from 'react';
import { Tooltip } from '@patternfly/react-core';
import './InlineTooltip.scss';

type InlineTooltipProps = {
  text: React.ReactNode;
  tooltip: React.ReactNode;
  'data-testid'?: string;
};

const InlineTooltip: React.FC<InlineTooltipProps> = ({ text, tooltip, 'data-testid': testId }) => (
  <Tooltip content={tooltip}>
    <button type="button" className="evalhub-inline-tooltip" data-testid={testId}>
      {text}
    </button>
  </Tooltip>
);

export default InlineTooltip;
