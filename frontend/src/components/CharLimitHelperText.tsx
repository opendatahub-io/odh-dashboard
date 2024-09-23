import { HelperText, HelperTextItem } from '@patternfly/react-core';
import React from 'react';

interface CharLimitHelperTextProps {
  limit: number;
}

export const CharLimitHelperText: React.FC<CharLimitHelperTextProps> = ({ limit }) => (
  <HelperText>
    <HelperTextItem>{`Cannot exceed ${limit} characters`}</HelperTextItem>
  </HelperText>
);
