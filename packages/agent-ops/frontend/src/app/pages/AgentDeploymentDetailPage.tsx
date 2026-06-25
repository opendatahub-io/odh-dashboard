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
  PageBreadcrumb,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { BanIcon, ExclamationCircleIcon, SearchIcon } from '@patternfly/react-icons';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import HeaderIcon from '@odh-dashboard/internal/concepts/design/HeaderIcon';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import AgentDetailsCard from '~/app/components/AgentDetailsCard';
import AgentMarkdownView from '~/app/components/AgentMarkdownView';
import AgentRuntimeStatusLabel from '~/app/components/AgentRuntimeStatusLabel';
import { useAgentRuntimeDetail } from '~/app/hooks/useAgentRuntimeDetail';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';

const AgentDeploymentDetailPage: React.FC = () => {
  const { namespace, agentId } = useParams<{ namespace: string; agentId: string }>();
  const [detail, loaded, error] = useAgentRuntimeDetail(namespace, agentId);

  if (!loaded) {
    return (
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
  }

  const isAccessDenied = !!error && getGenericErrorCode(error) === 403;
  const isNotFound = !!error && getGenericErrorCode(error) === 404;

  if (error) {
    return (
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
                ? `No agent "${agentId}" was found in project "${namespace}".`
                : 'Unable to load agent details. Please try again later.'}
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    );
  }

  if (!detail) {
    return (
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
  }

  const { name, description, agentCard, runtime } = detail;
  const descriptionText = description || agentCard?.description;
  const hasDescription = Boolean(descriptionText);

  return (
    <>
      <PageBreadcrumb hasBodyWrapper={false}>
        <Breadcrumb>
          <BreadcrumbItem>
            <Link to={agentOpsDeploymentsRoute(namespace)}>Agent deployments</Link>
          </BreadcrumbItem>
          <BreadcrumbItem isActive>{name}</BreadcrumbItem>
        </Breadcrumb>
      </PageBreadcrumb>
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
                  {name}
                </Title>
              </FlexItem>
              <FlexItem>
                <AgentRuntimeStatusLabel status={runtime.status} />
              </FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </PageSection>
      <PageSection hasBodyWrapper={false} isFilled>
        <Grid hasGutter>
          {hasDescription && descriptionText && (
            <GridItem lg={agentCard ? 8 : 12} md={12}>
              <Card data-testid="agent-description-card">
                <CardTitle>Description</CardTitle>
                <CardBody>
                  <AgentMarkdownView markdown={descriptionText} dataTestId="agent-description" />
                </CardBody>
              </Card>
            </GridItem>
          )}
          {agentCard && (
            <GridItem lg={hasDescription ? 4 : 12} md={12}>
              <AgentDetailsCard agentCard={agentCard} />
            </GridItem>
          )}
        </Grid>
      </PageSection>
    </>
  );
};

export default AgentDeploymentDetailPage;
