import * as React from 'react';
import {
  JumpLinks,
  JumpLinksItem,
  Sidebar,
  SidebarContent,
  SidebarPanel,
} from '@patternfly/react-core';

type GenericSidebarProps = {
  sections: string[];
  titles: Record<string, string>;
  scrollableSelector: string;
  maxWidth?: number;
};

const GenericSidebar: React.FC<GenericSidebarProps> = ({
  children,
  sections,
  titles,
  scrollableSelector,
  maxWidth,
}) => {
  return (
    <Sidebar hasGutter>
      <SidebarPanel variant="sticky" style={{ maxWidth }}>
        <JumpLinks isVertical label="Jump to section" scrollableSelector={scrollableSelector}>
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
};

export default GenericSidebar;
