import * as React from 'react';
import { Label } from '@patternfly/react-core';
import AiExperienceIcon from '../images/icons/AiExperienceIcon';

const AILabel: React.FC = () => (
  <Label icon={<AiExperienceIcon />} variant="outline" data-testid="ai-project-label" isCompact>
    AI
  </Label>
);

export default AILabel;
