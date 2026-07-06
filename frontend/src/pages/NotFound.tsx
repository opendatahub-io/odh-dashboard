import React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { HomeIcon, PathMissingIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => (
  <PageSection hasBodyWrapper={false}>
    <EmptyState
      headingLevel="h2"
      icon={PathMissingIcon}
      titleText="We can‘t find that page"
      variant={EmptyStateVariant.full}
      data-testid="not-found-page"
    >
      <EmptyStateBody data-testid="not-found-page-description">
        Another page might have what you need. Return to the home page.
      </EmptyStateBody>
      <EmptyStateFooter>
        <Button
          icon={<HomeIcon />}
          data-testid="home-page-button"
          component={(props) => <Link {...props} to="/" />}
          variant="primary"
        >
          Home
        </Button>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export default NotFound;
