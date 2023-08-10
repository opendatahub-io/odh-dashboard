import * as React from 'react';
import {
  JumpLinks,
  JumpLinksItem,
  Sidebar,
  SidebarContent,
  SidebarPanel,
} from '@patternfly/react-core';
import { DASHBOARD_MAIN_CONTAINER_SELECTOR } from '~/utilities/const';

type GenericSidebarProps = {
  sections: string[];
  titles: Record<string, string>;
  scrollableSelector?: string;
  maxWidth?: number;
  children: React.ReactNode;
};

const GenericSidebar: React.FC<GenericSidebarProps> = ({
  children,
  sections,
  titles,
  scrollableSelector = `#${DASHBOARD_MAIN_CONTAINER_SELECTOR}`,
  maxWidth,
}) => (
  <Sidebar hasGutter>
    <SidebarPanel variant="sticky" style={{ maxWidth, top: 'var(--pf-global--spacer--md)' }}>
      <JumpLinks
        isVertical
        label="Jump to section"
        scrollableSelector={scrollableSelector}
        offset={16}
      >
        {sections.map((section) => (
          <JumpLinksItem key={section} href={`#${section}`}>
            {titles[section]}
          </JumpLinksItem>
        ))}
      </JumpLinks>
    </SidebarPanel>
    <SidebarContent style={{ paddingBottom: 'var(--pf-global--spacer--lg)' }}>
      {children}
    </SidebarContent>
  </Sidebar>
);

export default GenericSidebar;
