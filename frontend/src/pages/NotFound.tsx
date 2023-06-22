import React from 'react';
import {
  Title,
  Button,
  EmptyState,
  EmptyStateVariant,
  EmptyStateIcon,
  EmptyStateBody,
  PageSection,
  PageSectionVariants,
} from '@patternfly/react-core';
import { HomeIcon, PathMissingIcon } from '@patternfly/react-icons';

const NotFound: React.FC = () => (
  <PageSection variant={PageSectionVariants.light}>
    <EmptyState variant={EmptyStateVariant.full}>
      <EmptyStateIcon icon={PathMissingIcon} />

      <Title headingLevel="h2" size="lg">
        We can&lsquo;t find that page
      </Title>
      <EmptyStateBody>
        Another page might have what you need. Return to the home page.
      </EmptyStateBody>
      <Button component="a" href="/" variant="primary">
        <HomeIcon /> Home
      </Button>
    </EmptyState>
  </PageSection>
);

export default NotFound;
