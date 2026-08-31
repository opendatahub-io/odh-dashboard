import * as React from 'react';
import { Divider, PageSection } from '@patternfly/react-core';
import AgentOpsFederatedProviders from '../AgentOpsFederatedProviders';
import AgentDeploymentsRoutes from '../AgentDeploymentsRoutes';
import ProjectsBridgeProviderWrapper from '../components/ProjectsBridgeProviderWrapper';
import ProviderHeader from './ProviderHeader';
import { nativeSandboxPath } from './providerRoutes';

const NativeSandboxesWrapper: React.FC = () => (
  <AgentOpsFederatedProviders>
    <ProjectsBridgeProviderWrapper>
      <ProviderHeader provider="native" />
      <PageSection hasBodyWrapper={false} className="pf-v6-u-pt-0">
        <Divider />
        <AgentDeploymentsRoutes getRedirectPath={nativeSandboxPath} embeddedProviderView />
      </PageSection>
    </ProjectsBridgeProviderWrapper>
  </AgentOpsFederatedProviders>
);

export default NativeSandboxesWrapper;
