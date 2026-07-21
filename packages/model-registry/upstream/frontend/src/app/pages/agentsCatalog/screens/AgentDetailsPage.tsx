import * as React from 'react';
import { useParams } from 'react-router';
import { Link } from 'react-router-dom';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  Flex,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { GithubIcon, SearchIcon } from '@patternfly/react-icons';
import { ApplicationsPage } from 'mod-arch-shared';
import { useAgent } from '~/app/hooks/agentsCatalog/useAgent';
import { agentsCatalogUrl } from '~/app/routes/agentsCatalog/agentsCatalog';
import { AGENTS_CATALOG_TITLE } from '~/app/pages/agentsCatalog/const';
import ScrollViewOnMount from '~/app/shared/components/ScrollViewOnMount';
import AgentsCatalogIcon from '~/app/pages/agentsCatalog/AgentsCatalogIcon';
import AgentDetailsView from './AgentDetailsView';

const AgentDetailsPage: React.FC = () => {
  const { agentId = '' } = useParams<{ agentId: string }>();
  const [agent, agentLoaded, agentLoadError] = useAgent(agentId);
  const [logoFailed, setLogoFailed] = React.useState(false);

  const isNotFound = !agent && (agentLoaded || !!agentLoadError);

  return (
    <>
      <ScrollViewOnMount shouldScroll scrollToTop />
      <ApplicationsPage
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem>
              <Link to={agentsCatalogUrl()}>{AGENTS_CATALOG_TITLE}</Link>
            </BreadcrumbItem>
            <BreadcrumbItem isActive data-testid="breadcrumb-agent-name">
              {agent?.displayName || agent?.name || agentId || 'Details'}
            </BreadcrumbItem>
          </Breadcrumb>
        }
        title={
          agent ? (
            <Flex
              spaceItems={{ default: 'spaceItemsMd' }}
              alignItems={{ default: 'alignItemsCenter' }}
            >
              {agent.logo && !logoFailed ? (
                <img
                  src={agent.logo}
                  alt="agent logo"
                  style={{ height: '40px', width: '40px' }}
                  onError={() => setLogoFailed(true)}
                />
              ) : (
                <AgentsCatalogIcon style={{ fontSize: '40px' }} data-testid="agent-default-icon" />
              )}
              <Stack>
                <StackItem>{agent.displayName || agent.name}</StackItem>
              </Stack>
            </Flex>
          ) : null
        }
        headerAction={
          agent && (
            <Flex alignSelf={{ default: 'alignSelfCenter' }}>
              <ActionList>
                <ActionListGroup>
                  {agent.repositoryUrl && (
                    <ActionListItem>
                      <Button
                        variant="secondary"
                        icon={<GithubIcon />}
                        component="a"
                        href={agent.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="agent-github-button"
                      >
                        Open GitHub
                      </Button>
                    </ActionListItem>
                  )}
                </ActionListGroup>
              </ActionList>
            </Flex>
          )
        }
        empty={isNotFound}
        emptyStatePage={
          isNotFound ? (
            <EmptyState icon={SearchIcon} titleText="Agent not found" data-testid="agent-not-found">
              <EmptyStateBody>The requested agent could not be found.</EmptyStateBody>
              <EmptyStateFooter>
                <Button
                  variant="primary"
                  component={(props) => <Link {...props} to={agentsCatalogUrl()} />}
                >
                  Return to {AGENTS_CATALOG_TITLE}
                </Button>
              </EmptyStateFooter>
            </EmptyState>
          ) : undefined
        }
        loadError={isNotFound ? undefined : agentLoadError}
        loaded={isNotFound || agentLoaded}
        errorMessage="Unable to load agent details"
        provideChildrenPadding
      >
        {agent && <AgentDetailsView agent={agent} />}
      </ApplicationsPage>
    </>
  );
};

export default AgentDetailsPage;
