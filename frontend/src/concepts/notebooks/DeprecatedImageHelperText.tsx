import React from 'react';
import { HelperText, HelperTextItem } from '@patternfly/react-core';

type DeprecatedImageHelperTextProps = {
  isLiveRegion?: boolean;
};

const DeprecatedImageHelperText: React.FC<DeprecatedImageHelperTextProps> = ({
  isLiveRegion = false,
}) => (
  <HelperText isLiveRegion={isLiveRegion}>
    <HelperTextItem variant="error">
      This image is deprecated and will not receive new version updates.
    </HelperTextItem>
  </HelperText>
);

export default DeprecatedImageHelperText;
