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
  return (
    <Sidebar hasGutter>
      <SidebarPanel variant="sticky">
        <JumpLinks isVertical label="Jump to section" scrollableSelector="#project-details-list">
          {Object.values(ProjectSectionID).map((section) => (
            <JumpLinksItem key={section} href={`#${section}`}>
              {ProjectSectionTitles[section]}
            </JumpLinksItem>
          ))}
        </JumpLinks>
      </SidebarPanel>
      <SidebarContent>{children}</SidebarContent>
    </Sidebar>
  );
};

export default ProjectDetailsSidebar;
