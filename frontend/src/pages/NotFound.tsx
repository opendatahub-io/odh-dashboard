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
        Page Not Found
      </Title>
      <EmptyStateBody>
        Uh oh, this page appears to be missing. Move along. Nothing to see here...
      </EmptyStateBody>
      <Button component="a" href="/" variant="primary">
        <HomeIcon /> Home
      </Button>
    </EmptyState>
  </PageSection>
);

export default NotFound;
