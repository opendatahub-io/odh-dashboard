import * as React from 'react';
import { Flex, FlexItem } from '@patternfly/react-core';

type IndentSectionProps = {
  children: React.ReactNode;
};

const IndentSection: React.FC<IndentSectionProps> = ({ children }) => {
  return (
    <Flex>
      <FlexItem spacer={{ default: 'spacerLg' }} />
      <FlexItem flex={{ default: 'flex_1' }}>{children}</FlexItem>
    </Flex>
  );
};

export default IndentSection;
