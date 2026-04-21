import * as React from 'react';
import { Button, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';

type LabelHelpPopoverProps = {
  ariaLabel: string;
  content: string;
  title?: string;
};

const LabelHelpPopover: React.FC<LabelHelpPopoverProps> = ({ ariaLabel, content, title }) => (
  <Popover headerContent={title} bodyContent={content}>
    <Button variant="plain" aria-label={ariaLabel} className="pf-v6-c-form__group-label-help">
      <OutlinedQuestionCircleIcon />
    </Button>
  </Popover>
);

export default LabelHelpPopover;
