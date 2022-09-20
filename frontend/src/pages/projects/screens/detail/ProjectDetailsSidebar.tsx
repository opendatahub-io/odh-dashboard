import * as React from 'react';
import {
  JumpLinks,
  JumpLinksItem,
  Sidebar,
  SidebarContent,
  SidebarPanel,
} from '@patternfly/react-core';
import { ProjectSectionID } from './types';
import { ProjectSectionTitles } from './const';

const ProjectDetailsSidebar: React.FC = ({ children }) => {
  const jumpLinkItems = [
    { id: ProjectSectionID.WORKSPACE, title: ProjectSectionTitles[ProjectSectionID.WORKSPACE] },
    { id: ProjectSectionID.STORAGE, title: ProjectSectionTitles[ProjectSectionID.STORAGE] },
    {
      id: ProjectSectionID.DATA_CONNECTIONS,
      title: ProjectSectionTitles[ProjectSectionID.DATA_CONNECTIONS],
    },
  ];

  return (
    <Sidebar hasGutter>
      <SidebarPanel variant="sticky">
        <JumpLinks isVertical label="Jump to section" scrollableSelector="#project-details-list">
          {jumpLinkItems.map(({ id, title }) => (
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
