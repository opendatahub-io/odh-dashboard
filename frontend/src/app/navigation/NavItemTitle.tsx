import React from 'react';
import { FlexItem, Flex, Label } from '@patternfly/react-core';
import { CodeIcon, CogIcon, FolderIcon, HomeIcon } from '@patternfly/react-icons';
import { NavIconType, ProjectObjectType } from '#~/concepts/design/utils.ts';
import NavIcon from './NavIcon';

type Props = {
  title: React.ReactNode;
  navIcon?: NavIconType;
  statusIcon?: React.ReactNode;
  label?: string;
};

export const NavItemTitle: React.FC<Props> = ({ title, navIcon, statusIcon, label }) => {
  const resolvedNavIcon = React.useMemo(() => {
    if (!navIcon) {
      return null;
    }

    switch (navIcon) {
      case NavIconType.home:
        return <NavIcon kind="custom" element={HomeIcon} />;
      case NavIconType.projects:
        return <NavIcon kind="custom" element={FolderIcon} />;
      case NavIconType.aiHub:
        return <NavIcon kind="project" type={ProjectObjectType.aiHub} />;
      case NavIconType.genAiStudio:
        return <NavIcon kind="project" type={ProjectObjectType.genAiStudio} />;
      case NavIconType.developAndTrain:
        return <NavIcon kind="custom" element={CodeIcon} />;
      case NavIconType.observeAndMonitor:
        return <NavIcon kind="project" type={ProjectObjectType.observeAndMonitor} />;
      case NavIconType.learningResources:
        return <NavIcon kind="project" type={ProjectObjectType.learningResources} />;
      case NavIconType.applications:
        return <NavIcon kind="project" type={ProjectObjectType.applications} />;
      case NavIconType.settings:
        return <NavIcon kind="custom" element={CogIcon} />;
      default: {
        // If you see a compilation error here, it means that you have added a new navIcon to the
        // NavIconType but forgot to handle it in the switch statement above.
        const value: never = navIcon;
        // eslint-disable-next-line no-console
        console.error('Unreachable code', value);
        return null;
      }
    }
  }, [navIcon]);

  if (!navIcon && !statusIcon && !label) {
    return title;
  }

  return (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} style={{ width: '100%' }}>
      {resolvedNavIcon && <FlexItem>{resolvedNavIcon}</FlexItem>}
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
