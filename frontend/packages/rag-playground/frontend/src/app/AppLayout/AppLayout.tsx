import * as React from 'react';
import { Page, SkipToContent } from '@patternfly/react-core';

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
    <Page mainContainerId={pageId} skipToContent={PageSkipToContent} isContentFilled>
      {children}
    </Page>
  );
};

export { AppLayout };
