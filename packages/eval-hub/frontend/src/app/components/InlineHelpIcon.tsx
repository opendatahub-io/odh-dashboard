import * as React from 'react';
import { Icon, Tooltip } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

type InlineHelpIconProps = {
  ariaLabel: string;
  content: string;
};

const InlineHelpIcon: React.FC<InlineHelpIconProps> = ({ ariaLabel, content }) => (
  <Tooltip content={content}>
    <Icon
      isInline
      aria-label={ariaLabel}
      style={{ color: 'var(--pf-t--global--icon--color--regular)', cursor: 'pointer' }}
    >
      <OutlinedQuestionCircleIcon />
    </Icon>
  </Tooltip>
);

export default InlineHelpIcon;
