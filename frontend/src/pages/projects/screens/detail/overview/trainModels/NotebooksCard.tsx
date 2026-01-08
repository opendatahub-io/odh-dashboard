import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  ButtonVariant,
  CardBody,
  EmptyState,
  EmptyStateBody,
  Flex,
  FlexItem,
  Spinner,
  Content,
  Tooltip,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { ProjectObjectType, SectionType, typedEmptyImage } from '#~/concepts/design/utils';
import OverviewCard from '#~/pages/projects/screens/detail/overview/components/OverviewCard';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import { KUEUE_WORKBENCH_CREATION_DISABLED_MESSAGE } from '#~/concepts/hardwareProfiles/kueueConstants';
import ErrorOverviewCard from '#~/pages/projects/screens/detail/overview/components/ErrorOverviewCard';
import { useAccessReview } from '#~/api';
import { AccessReviewResourceAttributes } from '#~/k8sTypes';
import { NotebookModel } from '#~/api/models';
import NotebooksCardItems from './NotebooksCardItems';
import MetricsContents from './MetricsContents';

const accessReviewResource: AccessReviewResourceAttributes = {
  group: NotebookModel.apiGroup,
  resource: NotebookModel.plural,
  verb: 'create',
};

const NotebooksCard: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentProject,
    notebooks: { data: notebooks, loaded, error },
  } = React.useContext(ProjectDetailsContext);

  const [allowCreate] = useAccessReview({
    ...accessReviewResource,
    namespace: currentProject.metadata.name,
  });

  const { isKueueDisabled } = useKueueConfiguration(currentProject);

  // Button is disabled if user lacks create permission or if Kueue is disabled
  const isButtonDisabled = !allowCreate || isKueueDisabled;
  const disabledReason = !allowCreate
    ? 'You do not have permission to create workbenches'
    : KUEUE_WORKBENCH_CREATION_DISABLED_MESSAGE;

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

  if (error) {
    return (
      <ErrorOverviewCard
        id="section-notebooks"
        objectType={ProjectObjectType.notebook}
        sectionType={SectionType.training}
        title="Notebooks"
        popoverHeaderContent="About notebooks"
        popoverBodyContent="Notebooks are isolated areas where you can work with models in your preferred IDE, such as a Jupyter notebook. You can add accelerators and connections, create pipelines, and configure cluster storage in your notebook."
        error={error}
      />
    );
  }

  if (!loaded) {
    return (
      <EmptyState headingLevel="h3" icon={() => <Spinner size="lg" />} variant="xs">
        <EmptyStateBody>Loading...</EmptyStateBody>
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
        popoverHeaderContent="About workbenches"
        popoverBodyContent="A workbench is an isolated area where you can work with models in your preferred IDE, such as a Jupyter notebook. You can add accelerators and connections, create pipelines, and add cluster storage in your workbench."
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
                <Content>
                  <Content component="small">
                    A workbench is an isolated area where you can work with models in your preferred
                    IDE, such as a Jupyter notebook. You can add accelerators and connections,
                    create pipelines, and configure cluster storage in your workbench.
                  </Content>
                </Content>
                {(() => {
                  const button = (
                    <Button
                      isAriaDisabled={isButtonDisabled}
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
                  );

                  return isButtonDisabled ? (
                    <Tooltip content={disabledReason}>{button}</Tooltip>
                  ) : (
                    button
                  );
                })()}
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
      popoverBodyContent="A workbench is an isolated area where you can work with models in your preferred IDE, such as a Jupyter notebook. You can add accelerators and connections, create pipelines, and add cluster storage in your workbench."
    >
      <MetricsContents
        title="Workbenches"
        createButton={
          isButtonDisabled ? (
            <Tooltip content={disabledReason}>
              <Button isAriaDisabled variant="link" isInline>
                Create workbench
              </Button>
            </Tooltip>
          ) : (
            <Button
              variant="link"
              isInline
              onClick={() => navigate(`/projects/${currentProject.metadata.name}/spawner`)}
            >
              Create workbench
            </Button>
          )
        }
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
