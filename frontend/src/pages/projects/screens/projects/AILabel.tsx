import * as React from 'react';
import { Label } from '@patternfly/react-core';
import { OutlinedStarIcon } from '@patternfly/react-icons';

export const AILabel: React.FC = () => (
  <Label icon={<OutlinedStarIcon />} variant="outline" data-testid="ai-project-label" isCompact>
    AI
  </Label>
);
