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
    {/* Note from PF: the zIndex override here can be removed once the following issue is resolved:
    https://github.com/patternfly/patternfly/issues/7229
    */}
    <SidebarPanel variant="sticky" style={{ maxWidth, zIndex: 'var(--pf-t--global--z-index--sm)' }}>
      <JumpLinks
        isVertical
        label="Jump to section"
        scrollableSelector={scrollableSelector}
        offset={16}
        expandable={{ default: 'expandable', md: 'nonExpandable' }}
        isExpanded
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
