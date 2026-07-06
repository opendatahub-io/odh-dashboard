import React from 'react';
import { FlexItem, Flex, Label } from '@patternfly/react-core';

type Props = {
  title: React.ReactNode;
  navIcon?: React.ReactNode;
  statusIcon?: React.ReactNode;
  label?: string;
};

export const NavItemTitle: React.FC<Props> = ({ title, navIcon, statusIcon, label }) => {
  if (!navIcon && !statusIcon && !label) {
    return title;
  }

  return (
    <Flex
      alignItems={{ default: 'alignItemsCenter' }}
      spaceItems={{ default: 'spaceItemsSm' }}
      style={{ width: '100%' }}
    >
      {navIcon && <FlexItem>{navIcon}</FlexItem>}
      <FlexItem flex={{ default: 'flex_1' }}>
        <Flex spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>{title}</FlexItem>
          {statusIcon && <FlexItem>{statusIcon}</FlexItem>}
        </Flex>
      </FlexItem>
      {label && (
        <FlexItem>
          <Label color="orange" variant="outline" isCompact>
            {label}
          </Label>
        </FlexItem>
      )}
    </Flex>
  );
};
