import React from 'react';
import { Button } from '@patternfly/react-core';
import { QuestionCircleIcon } from '@patternfly/react-icons';

const HelpPlaceholder: React.FC = () => (
  <Button aria-label="Help" variant="plain" icon={<QuestionCircleIcon />} isDisabled />
);

export default HelpPlaceholder;
