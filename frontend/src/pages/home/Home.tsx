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
import { ODH_PRODUCT_NAME } from '~/utilities/const';
import { useAIFlows } from './aiFlows/useAIFlows';

const Home: React.FC = () => {
  const aiFlows = useAIFlows();

  if (!aiFlows) {
    return (
      <PageSection data-testid="home-page-empty" variant={PageSectionVariants.default}>
        <Bullseye>
          <EmptyState variant="full">
            <EmptyStateHeader
              titleText={`Welcome to ${ODH_PRODUCT_NAME}`}
              headingLevel="h4"
              icon={<EmptyStateIcon icon={HomeIcon} />}
            />
          </EmptyState>
        </Bullseye>
      </PageSection>
    );
  }

  return <div data-testid="home-page">{aiFlows}</div>;
};

export default Home;
