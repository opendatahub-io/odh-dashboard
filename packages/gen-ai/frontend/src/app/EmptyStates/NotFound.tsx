import * as React from 'react';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  PageSection,
} from '@patternfly/react-core';

const NotFound: React.FunctionComponent = () => (
  <PageSection hasBodyWrapper={false}>
    <EmptyState titleText="404 Page not found" variant="full" icon={ExclamationTriangleIcon}>
      <EmptyStateBody>
        We didn&apos;t find a page that matches the address you navigated to.
      </EmptyStateBody>
      <EmptyStateFooter>
        <Button component="a" href="/">
          Take me home
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export { NotFound };
