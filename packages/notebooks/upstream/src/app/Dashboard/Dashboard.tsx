import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  PageSection,
  Text,
  TextContent
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';

const Dashboard: React.FunctionComponent = () => (
  <PageSection>
    <EmptyState variant={EmptyStateVariant.full} titleText="Empty State (Dashboard Module)" icon={CubesIcon}>
      <EmptyStateBody>
        <TextContent>
          <Text component="p">
            This represents an the empty state pattern in Patternfly 6. Hopefully it&apos;s simple enough to use but
            flexible enough to meet a variety of needs.
          </Text>
        </TextContent>
      </EmptyStateBody><EmptyStateFooter>
      <Button variant="primary">Primary Action</Button>

    </EmptyStateFooter></EmptyState>
  </PageSection>
);

export { Dashboard };
