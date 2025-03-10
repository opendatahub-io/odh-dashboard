import { Split, SplitItem } from '@patternfly/react-core';
import React from 'react';

type NavWithIconProps = {
  title: string;
  icon: React.ReactNode;
};

export const NavWithIcon: React.FC<NavWithIconProps> = ({ title, icon }) => (
  <Split hasGutter>
    <SplitItem>{title}</SplitItem>
    <SplitItem>{icon}</SplitItem>
  </Split>
);
