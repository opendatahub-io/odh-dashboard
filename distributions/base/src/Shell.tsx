import React from 'react';
import '@patternfly/patternfly/patternfly.min.css';
import '@patternfly/patternfly/patternfly-addons.css';
import { Page } from '@patternfly/react-core';

type ShellProps = {
  masthead: React.ReactNode;
  sidebar: React.ReactNode;
  children: React.ReactNode;
};

const Shell: React.FC<ShellProps> = ({ masthead, sidebar, children }) => (
  <Page
    className="base-app-shell"
    isManagedSidebar
    isContentFilled
    masthead={masthead}
    sidebar={sidebar}
    mainContainerId="base-app-shell-main"
  >
    {children}
  </Page>
);

export default Shell;
