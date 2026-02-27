import { FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import React from 'react';

interface CharLimitHelperTextProps {
  limit: number;
  currentLength: number;
}

export const CharLimitHelperText: React.FC<CharLimitHelperTextProps> = ({
  limit,
  currentLength,
}) => {
  if (currentLength < limit - 10) {
    return null;
  }
  return (
    <FormHelperText>
      <HelperText>
        <HelperTextItem variant={currentLength >= limit ? 'error' : 'warning'}>
          {`Cannot exceed ${limit} characters (${Math.max(0, limit - currentLength)} remaining)`}
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  );
};
