import * as React from 'react';
import { Page, PageSidebar, SkipToContent } from '@patternfly/react-core';

interface IAppLayout {
  children: React.ReactNode;
}

const AppLayout: React.FunctionComponent<IAppLayout> = ({ children }) => {
  const pageId = 'primary-app-container';

  const PageSkipToContent = (
    <SkipToContent
      onClick={(event) => {
        event.preventDefault();
        const primaryContentContainer = document.getElementById(pageId);
        primaryContentContainer?.focus();
      }}
      href={`#${pageId}`}
    >
      Skip to Content
    </SkipToContent>
  );

  return (
    <Page
      mainContainerId={pageId}
      isManagedSidebar={false}
      sidebar={<PageSidebar isSidebarOpen={false} />}
      skipToContent={PageSkipToContent}
      isContentFilled
    >
      {children}
    </Page>
  );
};

export { AppLayout };
