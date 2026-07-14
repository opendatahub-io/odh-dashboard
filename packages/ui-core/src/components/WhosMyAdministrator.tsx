import * as React from 'react';
import { Button, Popover, PopoverPosition } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import PopoverListContent from './PopoverListContent';

const FindAdministratorOptions = [
  'The person who gave you your username, or who helped you to log in for the first time',
  'Someone in your IT department or help desk',
  'A project manager or developer',
];

type Props = {
  buttonLabel?: string;
  headerContent?: string;
  leadText?: string;
  isInline?: boolean;
  contentTestId?: string;
  linkTestId?: string;
  popoverPosition?: PopoverPosition;
};

const WhosMyAdministrator: React.FC<Props> = ({
  buttonLabel = "Who's my administrator?",
  headerContent,
  leadText,
  isInline,
  contentTestId,
  linkTestId,
  popoverPosition = PopoverPosition.bottom,
}) => (
  <Popover
    showClose
    position={popoverPosition}
    headerContent={headerContent || 'Your administrator might be:'}
    hasAutoWidth
    maxWidth="370px"
    bodyContent={
      <PopoverListContent
        data-testid={contentTestId}
        leadText={leadText}
        listHeading={headerContent ? 'Your administrator might be:' : undefined}
        listItems={FindAdministratorOptions}
      />
    }
  >
    <Button
      isInline={isInline}
      variant="link"
      icon={<OutlinedQuestionCircleIcon />}
      data-testid={linkTestId}
    >
      {buttonLabel}
    </Button>
  </Popover>
);

export default WhosMyAdministrator;
