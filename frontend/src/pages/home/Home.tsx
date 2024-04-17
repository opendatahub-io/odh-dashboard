import * as React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateHeader,
  EmptyStateIcon,
  PageSection,
  PageSectionVariants,
} from '@patternfly/react-core';
import { HomeIcon } from '@patternfly/react-icons';

const Home: React.FC = () => (
  <PageSection data-testid="home-page" variant={PageSectionVariants.light}>
    <Bullseye>
      <EmptyState variant="full">
        <EmptyStateHeader
          titleText="Welcome to the home page"
          headingLevel="h4"
          icon={<EmptyStateIcon icon={HomeIcon} />}
          alt=""
        />
      </EmptyState>
    </Bullseye>
  </PageSection>
);

export default Home;
