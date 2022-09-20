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
  return (
    <Sidebar hasGutter>
      <SidebarPanel variant="sticky">
        <JumpLinks isVertical label="Jump to section" scrollableSelector="#project-details-list">
          <JumpLinksItem href={`#${ProjectSectionID.WORKSPACE}`}>
            {ProjectSectionTitle.WORKSPACE}
          </JumpLinksItem>
          <JumpLinksItem href={`#${ProjectSectionID.STORAGE}`}>
            {ProjectSectionTitle.STORAGE}
          </JumpLinksItem>
          <JumpLinksItem href={`#${ProjectSectionID.DATA_CONNECTIONS}`}>
            {ProjectSectionTitle.DATA_CONNECTIONS}
          </JumpLinksItem>
        </JumpLinks>
      </SidebarPanel>
      <SidebarContent>{children}</SidebarContent>
    </Sidebar>
  );
};

export default ProjectDetailsSidebar;
