import React from 'react';
import { FlexItem, Flex } from '@patternfly/react-core';

type Props = {
  title: React.ReactNode;
  icon?: React.ReactNode;
};

export const NavItemTitle: React.FC<Props> = ({ title, icon }) =>
  icon ? (
    <Flex spaceItems={{ default: 'spaceItemsSm' }}>
      <FlexItem>{title}</FlexItem>
      <FlexItem>{icon}</FlexItem>
    </Flex>
  ) : (
    title
  );
