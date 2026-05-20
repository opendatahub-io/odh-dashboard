import { Content, ContentVariants, PageSection } from '@patternfly/react-core';
import React from 'react';

const SubscriptionsTab: React.FC = () => (
  <PageSection isFilled>
    <Content component={ContentVariants.p}>
      Models available to you through your subscriptions, with token limits. Click a subscription to
      create a key for it.
    </Content>
  </PageSection>
);

export default SubscriptionsTab;
