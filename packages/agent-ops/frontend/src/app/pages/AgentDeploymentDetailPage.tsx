import * as React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Card,
  CardBody,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Grid,
  GridItem,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { BanIcon, ExclamationCircleIcon, SearchIcon } from '@patternfly/react-icons';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import HeaderIcon from '@odh-dashboard/internal/concepts/design/HeaderIcon';
import { ProjectObjectType } from '@odh-dashboard/ui-core';
import MarkdownComponent from '@odh-dashboard/internal/components/markdown/MarkdownComponent';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import AgentCapabilitiesCard from '~/app/components/AgentCapabilitiesCard';
import AgentDetailsCard from '~/app/components/AgentDetailsCard';
import AgentRuntimeStatusLabel from '~/app/components/AgentRuntimeStatusLabel';
import { useAgentRuntimeDetail } from '~/app/hooks/useAgentRuntimeDetail';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';

const AgentDeploymentDetailPage: React.FC = () => {
  const { namespace, agentId } = useParams<{ namespace: string; agentId: string }>();
  const [detail, loaded, error] = useAgentRuntimeDetail(namespace, agentId);

  const isAccessDenied = !!error && getGenericErrorCode(error) === 403;
  const isNotFound = !!error && getGenericErrorCode(error) === 404;

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={agentOpsDeploymentsRoute(namespace)}>Agent deployments</Link>
      </BreadcrumbItem>
      <BreadcrumbItem isActive>{detail?.name ?? agentId}</BreadcrumbItem>
    </Breadcrumb>
  );

  const loadingContent = (
    <PageSection hasBodyWrapper={false} isFilled>
      <EmptyState
        headingLevel="h1"
        titleText="Loading agent"
        variant={EmptyStateVariant.lg}
        data-testid="agent-detail-loading"
      >
        <Spinner size="xl" />
      </EmptyState>
    </PageSection>
  );

  const loadErrorPage = error ? (
    <PageSection hasBodyWrapper={false} isFilled>
      <EmptyState
        headingLevel="h1"
        icon={isAccessDenied ? BanIcon : isNotFound ? SearchIcon : ExclamationCircleIcon}
        titleText={
          isAccessDenied
            ? 'Access permissions needed'
            : isNotFound
              ? 'Agent not found'
              : 'Error loading agent'
        }
        variant={EmptyStateVariant.lg}
        data-testid={
          isAccessDenied
            ? 'agent-detail-access-denied'
            : isNotFound
              ? 'agent-detail-not-found'
              : 'agent-detail-error'
        }
      >
        <EmptyStateBody>
          {isAccessDenied
            ? 'You do not have permission to view this agent deployment.'
            : isNotFound
              ? `No agent "${agentId ?? 'unknown'}" was found in project "${namespace ?? 'unknown'}".`
              : 'Unable to load agent details. Please try again later.'}
        </EmptyStateBody>
      </EmptyState>
    </PageSection>
  ) : undefined;

  const emptyStatePage = (
    <PageSection hasBodyWrapper={false} isFilled>
      <EmptyState
        headingLevel="h1"
        icon={ExclamationCircleIcon}
        titleText="Agent not available"
        variant={EmptyStateVariant.lg}
        data-testid="agent-detail-unavailable"
      >
        <EmptyStateBody>Unable to load agent details. Please try again later.</EmptyStateBody>
      </EmptyState>
    </PageSection>
  );

  const descriptionText = [detail?.description, detail?.agentCard?.description]
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value));
  const hasDescription = Boolean(descriptionText);
  const hasSkills = (detail?.agentCard?.skills?.length ?? 0) > 0;
  const hasMainColumnContent = hasDescription || hasSkills;

  return (
    <ApplicationsPage
      breadcrumb={breadcrumb}
      loaded={loaded}
      loadError={error}
      loadErrorPage={loadErrorPage}
      empty={loaded && !error && !detail}
      emptyStatePage={emptyStatePage}
      loadingContent={loadingContent}
      noHeader
    >
      {detail && (
        <>
          <PageSection hasBodyWrapper={false}>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              gap={{ default: 'gapMd' }}
              flexWrap={{ default: 'wrap' }}
            >
              <FlexItem>
                <HeaderIcon type={ProjectObjectType.agentOps} size={56} padding={8} />
              </FlexItem>
              <FlexItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                  <FlexItem>
                    <Title headingLevel="h1" size="2xl" data-testid="agent-detail-title">
                      {detail.name}
                    </Title>
                  </FlexItem>
                  <FlexItem>
                    <AgentRuntimeStatusLabel status={detail.runtime.status} />
                  </FlexItem>
                </Flex>
              </FlexItem>
            </Flex>
          </PageSection>
          <PageSection hasBodyWrapper={false} isFilled>
            <Grid hasGutter>
              {hasMainColumnContent && (
                <GridItem lg={detail.agentCard ? 8 : 12} md={12}>
                  <Stack hasGutter>
                    {descriptionText && (
                      <StackItem>
                        <Card data-testid="agent-description-card">
                          <CardTitle>Description</CardTitle>
                          <CardBody>
                            <MarkdownComponent
                              data={descriptionText}
                              dataTestId="agent-description"
                              maxHeading={3}
                            />
                          </CardBody>
                        </Card>
                      </StackItem>
                    )}
                    {hasSkills && detail.agentCard && (
                      <StackItem>
                        <AgentCapabilitiesCard agentCard={detail.agentCard} />
                      </StackItem>
                    )}
                  </Stack>
                </GridItem>
              )}
              {detail.agentCard && (
                <GridItem lg={hasMainColumnContent ? 4 : 12} md={12}>
                  <AgentDetailsCard agentCard={detail.agentCard} />
                </GridItem>
              )}
            </Grid>
          </PageSection>
        </>
      )}
    </ApplicationsPage>
  );
};

export default AgentDeploymentDetailPage;
