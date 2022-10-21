import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';

const IndentSection: React.FC = ({ children }) => {
  return (
    <Flex>
      <FlexItem spacer={{ default: 'spacerLg' }} />
      <FlexItem flex={{ default: 'flex_1' }}>{children}</FlexItem>
    </Flex>
  );
};

export default IndentSection;
