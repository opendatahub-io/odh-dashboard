import * as React from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Icon,
  PageSection,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { GithubIcon } from '@patternfly/react-icons';
import type { Agent } from '~/app/agentsCatalogTypes';
import { AGENT_FRAMEWORK_LABEL_MAPPING } from '~/app/pages/agentsCatalog/const';
import MarkdownComponent from '~/app/shared/markdown/MarkdownComponent';

type AgentDetailsViewProps = {
  agent: Agent;
};

const AgentDetailsView: React.FC<AgentDetailsViewProps> = ({ agent }) => (
  <PageSection hasBodyWrapper={false} isFilled padding={{ default: 'noPadding' }}>
    <Sidebar hasGutter isPanelRight>
      <SidebarContent style={{ minWidth: 0, overflow: 'hidden' }}>
        <Stack hasGutter>
          <StackItem>
            <Card>
              <CardHeader>
                <Title headingLevel="h2" size="lg">
                  Description
                </Title>
              </CardHeader>
              <CardBody>
                <Content className="pf-v6-u-text-break-word">
                  <p data-testid="agent-description">{agent.description || 'No description'}</p>
                </Content>
              </CardBody>
            </Card>
          </StackItem>
          <StackItem>
            <Card>
              <CardHeader>
                <Title headingLevel="h2" size="lg">
                  <Icon isInline style={{ marginRight: '4px' }}>
                    <GithubIcon />
                  </Icon>
                  README
                </Title>
              </CardHeader>
              <CardBody>
                {!agent.readme && (
                  <Content component="p" data-testid="agent-no-readme">
                    No README available
                  </Content>
                )}
                {agent.readme && (
                  <MarkdownComponent
                    data={agent.readme}
                    dataTestId="agent-readme-markdown"
                    maxHeading={3}
                  />
                )}
              </CardBody>
            </Card>
          </StackItem>
        </Stack>
      </SidebarContent>
      <SidebarPanel width={{ default: 'width_33' }}>
        <Card>
          <CardHeader>
            <Title headingLevel="h2" size="lg">
              Template details
            </Title>
          </CardHeader>
          <CardBody>
            <DescriptionList>
              {agent.framework && (
                <DescriptionListGroup>
                  <DescriptionListTerm>Framework</DescriptionListTerm>
                  <DescriptionListDescription data-testid="agent-framework">
                    {AGENT_FRAMEWORK_LABEL_MAPPING[agent.framework] ?? agent.framework}
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
            </DescriptionList>
          </CardBody>
        </Card>
      </SidebarPanel>
    </Sidebar>
  </PageSection>
);

export default AgentDetailsView;
