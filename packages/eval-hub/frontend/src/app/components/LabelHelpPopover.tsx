import * as React from 'react';
import { Popover } from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';

type LabelHelpPopoverProps = {
  ariaLabel: string;
  content: string;
  title?: string;
};

const LabelHelpPopover: React.FC<LabelHelpPopoverProps> = ({ ariaLabel, content, title }) => (
  <Popover headerContent={title} bodyContent={content}>
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={(e) => e.preventDefault()}
      className="pf-v6-c-form__group-label-help"
    >
      <HelpIcon />
    </button>
  </Popover>
);

export default LabelHelpPopover;
