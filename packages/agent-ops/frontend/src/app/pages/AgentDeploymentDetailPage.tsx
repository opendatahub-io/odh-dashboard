import React from 'react';
import { useParams } from 'react-router-dom';
import { Content, ContentVariants, PageSection } from '@patternfly/react-core';

const AgentDeploymentDetailPage: React.FC = () => {
  const { namespace, agentId } = useParams<{ namespace: string; agentId: string }>();

  return (
    <PageSection>
      <Content component={ContentVariants.h1}>Agent deployment</Content>
      <Content component={ContentVariants.p}>
        TODO: Detail for agent &quot;{agentId}&quot; in project &quot;{namespace}&quot;
      </Content>
    </PageSection>
  );
};

export default AgentDeploymentDetailPage;
