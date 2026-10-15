import React from 'react';
import { HelperText, HelperTextItem } from '@patternfly/react-core';

type DeprecatedImageHelperTextProps = {
  isLiveRegion?: boolean;
  testId?: string;
};

const DeprecatedImageHelperText: React.FC<DeprecatedImageHelperTextProps> = ({
  isLiveRegion = false,
  testId,
}) => (
  <HelperText isLiveRegion={isLiveRegion}>
    <HelperTextItem data-testid={testId} variant="error">
      This image is deprecated and will not receive new version updates.
    </HelperTextItem>
  </HelperText>
);

export default DeprecatedImageHelperText;
