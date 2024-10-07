import * as React from 'react';
import {
  JumpLinks,
  JumpLinksItem,
  Sidebar,
  SidebarContent,
  SidebarPanel,
} from '@patternfly/react-core';
import { DASHBOARD_SCROLL_CONTAINER_SELECTOR } from '~/utilities/const';

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
  scrollableSelector = DASHBOARD_SCROLL_CONTAINER_SELECTOR,
  maxWidth,
}) => (
  <Sidebar hasGutter>
    <SidebarPanel variant="sticky" style={{ maxWidth, top: 'var(--pf-t--global--spacer--md)' }}>
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
    <SidebarContent style={{ paddingBottom: 'var(--pf-t--global--spacer--lg)' }}>
      {children}
    </SidebarContent>
  </Sidebar>
);

export default GenericSidebar;
