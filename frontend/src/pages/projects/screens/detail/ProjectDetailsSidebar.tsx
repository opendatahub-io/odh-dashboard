import * as React from 'react';
import {
  JumpLinks,
  JumpLinksItem,
  Sidebar,
  SidebarContent,
  SidebarPanel,
} from '@patternfly/react-core';

const ProjectDetailsSidebarWrapper: React.FC = ({ children }) => {
  return (
    <Sidebar hasGutter>
      <SidebarPanel variant="sticky">
        <JumpLinks isVertical label="Jump to section" scrollableSelector="#project-details-list">
          <JumpLinksItem href="#data-science-workspaces">Data science workspaces</JumpLinksItem>
          <JumpLinksItem href="#storage">Storage</JumpLinksItem>
          <JumpLinksItem href="#data-connections">Data connections</JumpLinksItem>
          <JumpLinksItem href="#model-serving">Model serving</JumpLinksItem>
        </JumpLinks>
      </SidebarPanel>
      <SidebarContent>{children}</SidebarContent>
    </Sidebar>
  );
};

export default ProjectDetailsSidebarWrapper;
