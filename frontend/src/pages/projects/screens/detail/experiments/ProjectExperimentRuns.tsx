import * as React from 'react';
import { ButtonVariant, PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { experimentRunsPageDescription } from '~/pages/pipelines/global/runs/const';
import PipelineRunVersionsContextProvider from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';
import { ProjectObjectType } from '~/concepts/design/utils';
import {
  ExperimentListTabRoutes,
  projectExperimentArchivedRunsRoute,
  projectExperimentRunsRoute,
} from '~/routes';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import PipelineServerActions from '~/concepts/pipelines/content/PipelineServerActions';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  ActiveRuns,
  ArchivedRuns,
  PipelineRunTabTitle,
  PipelineRunType,
  ScheduledRuns,
} from '~/pages/pipelines/global/runs';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import PipelineAndVersionContextProvider from '~/concepts/pipelines/content/PipelineAndVersionContext';

const ProjectExperimentRuns: React.FC = () => {
  const pipelinesAPI = usePipelinesAPI();
  const { pipelinesServer } = usePipelinesAPI();
  const navigate = useNavigate();
  const { namespace, tab, experimentId, runTab } = useParams();

  return (
    <DetailsSection
      objectType={ProjectObjectType.pipelineRun}
      id={ProjectSectionID.RUNS}
      title={ProjectSectionTitles[ProjectSectionID.RUNS]}
      description={experimentRunsPageDescription}
      isLoading={pipelinesServer.initializing}
      isEmpty={!pipelinesServer.installed}
      emptyState={<NoPipelineServer variant={ButtonVariant.primary} />}
      actions={[
        <PipelineServerActions
          key="actions"
          isDisabled={!pipelinesAPI.pipelinesServer.installed}
        />,
      ]}
    >
      <EnsureAPIAvailability>
        <EnsureCompatiblePipelineServer>
          <PipelineAndVersionContextProvider>
            <PipelineRunVersionsContextProvider>
              <Tabs
                activeKey={runTab || PipelineRunType.ACTIVE}
                onSelect={(_event, tabId) => {
                  if (experimentId) {
                    const path =
                      tab === ExperimentListTabRoutes.ARCHIVED
                        ? projectExperimentArchivedRunsRoute(namespace, experimentId, `${tabId}`)
                        : projectExperimentRunsRoute(namespace, experimentId, `${tabId}`);
                    navigate(path);
                  }
                }}
                aria-label="Pipeline run page tabs"
                role="region"
                className="odh-pipeline-runs-page-tabs"
                data-testid="pipeline-runs-global-tabs"
                mountOnEnter
                unmountOnExit
              >
                <Tab
                  eventKey={PipelineRunType.ACTIVE}
                  title={<TabTitleText>{PipelineRunTabTitle.ACTIVE}</TabTitleText>}
                  aria-label={`${PipelineRunTabTitle.ACTIVE} tab`}
                  className="odh-pipeline-runs-page-tabs__content"
                  data-testid="active-runs-tab"
                >
                  <PageSection hasBodyWrapper={false} isFilled>
                    <ActiveRuns />
                  </PageSection>
                </Tab>
                <Tab
                  eventKey={PipelineRunType.ARCHIVED}
                  title={<TabTitleText>{PipelineRunTabTitle.ARCHIVED}</TabTitleText>}
                  aria-label={`${PipelineRunTabTitle.ARCHIVED} tab`}
                  className="odh-pipeline-runs-page-tabs__content"
                  data-testid="archived-runs-tab"
                >
                  <PageSection hasBodyWrapper={false} isFilled>
                    <ArchivedRuns />
                  </PageSection>
                </Tab>
                <Tab
                  eventKey={PipelineRunType.SCHEDULED}
                  title={<TabTitleText>{PipelineRunTabTitle.SCHEDULES}</TabTitleText>}
                  aria-label={`${PipelineRunTabTitle.SCHEDULES} tab`}
                  className="odh-pipeline-runs-page-tabs__content"
                  data-testid="schedules-tab"
                >
                  <PageSection hasBodyWrapper={false} isFilled>
                    <ScheduledRuns />
                  </PageSection>
                </Tab>
              </Tabs>
            </PipelineRunVersionsContextProvider>
          </PipelineAndVersionContextProvider>
        </EnsureCompatiblePipelineServer>
      </EnsureAPIAvailability>
    </DetailsSection>
  );
};

export default ProjectExperimentRuns;
