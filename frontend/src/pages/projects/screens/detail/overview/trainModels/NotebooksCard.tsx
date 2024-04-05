import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  ButtonVariant,
  CardBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Flex,
  FlexItem,
  Spinner,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { ArrowRightIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '~/api';
import { AccessReviewResource } from '~/pages/projects/screens/detail/const';
import { ProjectObjectType, SectionType, typedEmptyImage } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import NotebooksCardItems from './NotebooksCardItems';
import MetricsContents from './MetricsContents';

const NotebooksCard: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentProject,
    notebooks: { data: notebooks, loaded, error },
  } = React.useContext(ProjectDetailsContext);
  const [allowCreate] = useAccessReview({
    ...AccessReviewResource,
    namespace: currentProject.metadata.name,
  });

  const statistics = React.useMemo(
    () => [
      {
        count: notebooks.filter((n) => n.isStopped).length,
        text: 'Stopped',
      },
      {
        count: notebooks.filter((n) => n.isStarting).length,
        text: 'Starting',
      },
      {
        count: notebooks.filter((n) => n.isRunning).length,
        text: 'Running',
      },
    ],
    [notebooks],
  );

  if (!loaded) {
    return (
      <EmptyState variant="xs">
        <EmptyStateHeader
          icon={<EmptyStateIcon icon={() => <Spinner size="lg" />} />}
          headingLevel="h3"
        />
        <EmptyStateBody>Loading...</EmptyStateBody>
      </EmptyState>
    );
  }

  if (error) {
    return (
      <EmptyState variant="xs">
        <EmptyStateHeader
          icon={
            <EmptyStateIcon
              icon={() => (
                <ExclamationCircleIcon
                  style={{
                    color: 'var(--pf-v5-global--danger-color--100)',
                    width: '32px',
                    height: '32px',
                  }}
                />
              )}
            />
          }
          headingLevel="h3"
        />
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (notebooks.length === 0) {
    return (
      <OverviewCard
        data-testid="section-workbenches"
        objectType={ProjectObjectType.notebook}
        sectionType={SectionType.training}
        title="Workbenches"
      >
        <CardBody>
          <Flex
            gap={{ default: 'gapMd' }}
            flexWrap={{ default: 'nowrap' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
          >
            <FlexItem>
              <img src={typedEmptyImage(ProjectObjectType.project)} alt="" style={{ width: 200 }} />
            </FlexItem>
            <FlexItem flex={{ default: 'flex_1' }}>
              <Flex gap={{ default: 'gapMd' }}>
                <TextContent>
                  <Text component="small">
                    A workbench is an isolated area where you can work with models in your preferred
                    IDE, such as a Jupyter notebook. You can add accelerators and data connections,
                    create pipelines, and configure cluster storage in your workbench.
                  </Text>
                </TextContent>
                <Button
                  variant={ButtonVariant.primary}
                  onClick={() => navigate(`/projects/${currentProject.metadata.name}/spawner`)}
                >
                  <Flex
                    gap={{ default: 'gapMd' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                    flexWrap={{ default: 'nowrap' }}
                  >
                    <FlexItem>Create a workbench</FlexItem>
                    <ArrowRightIcon />
                  </Flex>
                </Button>
              </Flex>
            </FlexItem>
          </Flex>
        </CardBody>
      </OverviewCard>
    );
  }

  return (
    <OverviewCard
      data-testid="section-workbenches"
      objectType={ProjectObjectType.notebook}
      sectionType={SectionType.training}
      title="Workbenches"
      popoverHeaderContent="About workbenches"
      popoverBodyContent="Creating a workbench allows you to add a Jupyter notebook to your project."
    >
      <MetricsContents
        title="Workbenches"
        allowCreate={allowCreate}
        onCreate={() => navigate(`/projects/${currentProject.metadata.name}/spawner`)}
        createText="Create workbench"
        statistics={statistics}
        listItems={
          <NotebooksCardItems
            notebooks={notebooks}
            currentProject={currentProject}
            error={error}
            loaded={loaded}
          />
        }
      />
    </OverviewCard>
  );
};

export default NotebooksCard;
