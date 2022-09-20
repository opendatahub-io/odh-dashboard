import * as React from 'react';
import {
  JumpLinks,
  JumpLinksItem,
  Sidebar,
  SidebarContent,
  SidebarPanel,
} from '@patternfly/react-core';
import { ProjectSectionID, ProjectSectionTitle } from './types';

const ProjectDetailsSidebar: React.FC = ({ children }) => {
  const navItems = [
    { id: ProjectSectionID.WORKSPACE, title: ProjectSectionTitle.WORKSPACE },
    { id: ProjectSectionID.STORAGE, title: ProjectSectionTitle.STORAGE },
    { id: ProjectSectionID.DATA_CONNECTIONS, title: ProjectSectionTitle.DATA_CONNECTIONS },
  ];

  return (
    <Sidebar hasGutter>
      <SidebarPanel variant="sticky">
        <JumpLinks isVertical label="Jump to section" scrollableSelector="#project-details-list">
          {navItems.map(({ id, title }) => (
            <JumpLinksItem key={`link-${id}`} href={`#${id}`}>
              {title}
            </JumpLinksItem>
          ))}
        </JumpLinks>
      </SidebarPanel>
      <SidebarContent>{children}</SidebarContent>
    </Sidebar>
  );
};

export default ProjectDetailsSidebar;
