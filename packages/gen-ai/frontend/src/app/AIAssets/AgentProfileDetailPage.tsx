import * as React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionToggle,
  Alert,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  ButtonVariant,
  Content,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Label,
  PageSection,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, InProgressIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import { ApplicationsPage } from 'mod-arch-shared';
import { AgentDeploymentSummary } from '~/app/agentProfile/types';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import { genAiAiAssetsTabRoute, genAiChatPlaygroundRoute } from '~/app/utilities/routes';
import NoData from '~/app/EmptyStates/NoData';
import useFetchAgentProfiles from '~/app/hooks/useFetchAgentProfiles';
import useFetchAgentDeployments from './hooks/useFetchAgentDeployments';
import useFetchAgentProfile from './hooks/useFetchAgentProfile';
import AgentConfigurationCard from './components/agentprofiles/AgentConfigurationCard';

type DeploymentAccordionItemProps = {
  deployment: AgentDeploymentSummary;
  isLatest: boolean;
};

const formatDeploymentDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const deploymentStateLabel = (state: AgentDeploymentSummary['state']): React.ReactNode => {
  switch (state) {
    case 'ready':
      return <Label status="success">Active</Label>;
    case 'failed':
      return (
        <Label color="red" icon={<ExclamationCircleIcon />}>
          Failed
        </Label>
      );
    default:
      return (
        <Label color="grey" icon={<InProgressIcon />}>
          Creating
        </Label>
      );
  }
};

const DeploymentAccordionItem: React.FC<DeploymentAccordionItemProps> = ({
  deployment,
  isLatest,
}) => {
  const { api } = useGenAiAPI();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [details, setDetails] = React.useState<AgentDeploymentSummary | null>(null);
  const [loadingDetails, setLoadingDetails] = React.useState(false);
  const [detailsError, setDetailsError] = React.useState<string | null>(null);
  const contentId = React.useId();
  const toggleId = `agent-deployment-${deployment.name}-toggle`;

  const handleToggle = React.useCallback(() => {
    setIsExpanded((wasExpanded) => {
      const willExpand = !wasExpanded;
      if (willExpand && !details && !loadingDetails) {
        setLoadingDetails(true);
        setDetailsError(null);
        void api
          .getAgentDeployment({ id: deployment.name })
          .then(setDetails)
          .catch(() => setDetailsError('Unable to load this deployment snapshot.'))
          .finally(() => setLoadingDetails(false));
      }
      return willExpand;
    });
  }, [api, deployment.name, details, loadingDetails]);

  return (
    <AccordionItem isExpanded={isExpanded} data-testid={`agent-deployment-${deployment.name}`}>
      <AccordionToggle
        id={toggleId}
        onClick={handleToggle}
        aria-controls={contentId}
        data-testid={`agent-deployment-${deployment.name}-toggle`}
      >
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
          <FlexItem>
            <strong>{deployment.name}</strong>
          </FlexItem>
          {isLatest && (
            <FlexItem>
              <Label color="blue">Latest</Label>
            </FlexItem>
          )}
          <FlexItem>{deploymentStateLabel(deployment.state)}</FlexItem>
          <FlexItem>{formatDeploymentDate(deployment.createdAt)}</FlexItem>
        </Flex>
      </AccordionToggle>
      {isExpanded && (
        <AccordionContent id={contentId} aria-labelledby={toggleId}>
          <Stack hasGutter>
            {deployment.lastError && (
              <StackItem>
                <Alert variant="danger" isInline title={deployment.lastError} />
              </StackItem>
            )}
            {loadingDetails && (
              <StackItem>
                <Bullseye>
                  <Spinner size="md" aria-label="Loading deployment details" />
                </Bullseye>
              </StackItem>
            )}
            {detailsError && (
              <StackItem>
                <Alert variant="warning" isInline title={detailsError} />
              </StackItem>
            )}
            {details?.config && (
              <StackItem>
                <AgentConfigurationCard profile={details.config} title="Deployed snapshot" />
              </StackItem>
            )}
            {details && !details.config && !loadingDetails && !detailsError && (
              <StackItem>
                <Alert
                  variant="info"
                  isInline
                  title="The deployment is available, but its configuration snapshot could not be retrieved."
                />
              </StackItem>
            )}
            {deployment.routeUrl && (
              <StackItem>
                <Content component="h3">Endpoint</Content>
                <a href={deployment.routeUrl} target="_blank" rel="noreferrer">
                  {deployment.routeUrl}
                </a>
              </StackItem>
            )}
          </Stack>
        </AccordionContent>
      )}
    </AccordionItem>
  );
};

const AgentProfileDetailPage: React.FC = () => {
  const { namespace, profileId } = useParams<{ namespace: string; profileId: string }>();
  const {
    data: profile,
    loaded: profileLoaded,
    error: profileError,
  } = useFetchAgentProfile(profileId);
  const {
    data: deployments = [],
    loaded: deploymentsLoaded,
    error: deploymentsError,
  } = useFetchAgentDeployments(profileId);
  const { data: profiles = [] } = useFetchAgentProfiles();

  if (!profileLoaded && !profileError) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (profileError || !profile) {
    return (
      <NoData
        title="Unable to load agent configuration"
        description="There was a problem loading this agent configuration. Try refreshing the page."
      />
    );
  }

  const playgroundPath = `${genAiChatPlaygroundRoute(
    namespace,
  )}?agentProfileId=${encodeURIComponent(profileId ?? '')}`;
  const lastModified = profiles.find(
    (candidate) => candidate.profileId === profileId,
  )?.lastModified;

  return (
    <ApplicationsPage
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem to={genAiAiAssetsTabRoute(namespace ?? '', 'agentprofile')}>
            AI asset endpoints
          </BreadcrumbItem>
          <BreadcrumbItem to={genAiAiAssetsTabRoute(namespace ?? '', 'agentprofile')}>
            Agents
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{profile.spec.displayName}</BreadcrumbItem>
        </Breadcrumb>
      }
      noHeader
      loaded
      empty={false}
    >
      <PageSection>
        <Stack hasGutter>
          <StackItem>
            <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
              <FlexItem>
                <Content>
                  <Content component="h1">{profile.spec.displayName}</Content>
                  {profile.spec.description && (
                    <Content component="p">{profile.spec.description}</Content>
                  )}
                </Content>
              </FlexItem>
              <FlexItem>
                <Button
                  variant={ButtonVariant.link}
                  component={(props) => <Link {...props} to={playgroundPath} />}
                  data-testid="edit-in-playground"
                >
                  Edit in playground
                </Button>
              </FlexItem>
            </Flex>
          </StackItem>
          <StackItem>
            <Content component="h2">Saved configuration</Content>
          </StackItem>
          <StackItem>
            <AgentConfigurationCard
              profile={profile}
              title="Current saved state"
              lastModified={lastModified}
              isSavedConfiguration
            />
          </StackItem>
          <StackItem>
            <Content component="h2">Deployments ({deployments.length})</Content>
          </StackItem>
          <StackItem>
            {!deploymentsLoaded && !deploymentsError && (
              <Bullseye>
                <Spinner size="md" aria-label="Loading deployments" />
              </Bullseye>
            )}
            {deploymentsError && (
              <Alert
                variant="warning"
                isInline
                title="Unable to load deployments for this agent configuration."
              />
            )}
            {deploymentsLoaded && !deploymentsError && deployments.length === 0 && (
              <EmptyState headingLevel="h3" titleText="No deployments" variant="sm">
                <EmptyStateBody>This agent configuration has not been deployed yet.</EmptyStateBody>
              </EmptyState>
            )}
            {deployments.length > 0 && (
              <Accordion asDefinitionList isBordered togglePosition="start">
                {deployments.map((deployment, index) => (
                  <DeploymentAccordionItem
                    key={deployment.name}
                    deployment={deployment}
                    isLatest={index === 0}
                  />
                ))}
              </Accordion>
            )}
          </StackItem>
        </Stack>
      </PageSection>
    </ApplicationsPage>
  );
};

export default AgentProfileDetailPage;
