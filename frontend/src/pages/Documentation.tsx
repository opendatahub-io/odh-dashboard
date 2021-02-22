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
import { HomeIcon, WarningTriangleIcon } from '@patternfly/react-icons';

const Documentation: React.FC = () => (
  <>
    <PageSection variant={PageSectionVariants.light}>
      <EmptyState variant={EmptyStateVariant.full}>
        <EmptyStateIcon icon={WarningTriangleIcon} />

        <Title headingLevel="h5" size="lg">
          Placeholder
        </Title>
        <EmptyStateBody>Docs</EmptyStateBody>
        <Button component="a" href="/" variant="primary">
          <HomeIcon /> Home
        </Button>
      </EmptyState>
    </PageSection>
  </>
);

export default Documentation;
