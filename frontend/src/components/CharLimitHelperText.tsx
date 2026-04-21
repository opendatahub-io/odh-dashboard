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
  // Threshold of 10 is consistent with K8sNameDescriptionField (showNameWarning),
  // which uses `maxLength - 10` to only warn when the user is close to the limit.
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
