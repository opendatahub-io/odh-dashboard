import * as React from 'react';
import { Divider, PageSection } from '@patternfly/react-core';
import AgentDeploymentsRoutes from '~/odh/AgentDeploymentsRoutes';
import AgentOpsFederatedProviders from '~/odh/AgentOpsFederatedProviders';
import ProjectsBridgeProviderWrapper from '~/odh/components/ProjectsBridgeProviderWrapper';
import ProviderHeader from './ProviderHeader';
import { nativeSandboxPath } from './providerRoutes';

const NativeSandboxesWrapper: React.FC = () => (
  <AgentOpsFederatedProviders>
    <ProjectsBridgeProviderWrapper>
      <ProviderHeader provider="native" />
      <PageSection hasBodyWrapper={false} className="pf-v6-u-pt-0">
        <Divider />
        <AgentDeploymentsRoutes
          getRedirectPath={nativeSandboxPath}
          embeddedProviderView
          namespacePath="projects/:namespace"
        />
      </PageSection>
    </ProjectsBridgeProviderWrapper>
  </AgentOpsFederatedProviders>
);

export default NativeSandboxesWrapper;
