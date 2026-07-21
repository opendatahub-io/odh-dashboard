import React from 'react';
import { Tooltip } from '@patternfly/react-core';
import './InlineTooltip.scss';

type InlineTooltipProps = {
  text: React.ReactNode;
  tooltip: React.ReactNode;
};

const InlineTooltip: React.FC<InlineTooltipProps> = ({ text, tooltip }) => (
  <Tooltip content={tooltip}>
    <button type="button" className="automl-inline-tooltip">
      {text}
    </button>
  </Tooltip>
);

export default InlineTooltip;
