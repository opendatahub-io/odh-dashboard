import * as React from 'react';
import { ButtonVariant, PageSection, Tab, Tabs, TabTitleText } from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import PipelineServerActions from '~/concepts/pipelines/content/PipelineServerActions';
import EnsureAPIAvailability from '~/concepts/pipelines/EnsureAPIAvailability';
import PipelineAndVersionContextProvider from '~/concepts/pipelines/content/PipelineAndVersionContext';
import EnsureCompatiblePipelineServer from '~/concepts/pipelines/EnsureCompatiblePipelineServer';
import { ProjectObjectType } from '~/concepts/design/utils';
import NoPipelineServer from '~/concepts/pipelines/NoPipelineServer';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import { ProjectSectionTitles } from '~/pages/projects/screens/detail/const';
import DetailsSection from '~/pages/projects/screens/detail/DetailsSection';
import {
  ExperimentListTabs,
  ExperimentListTabTitle,
  experimentsPageDescription,
} from '~/pages/pipelines/global/experiments/const';
import ActiveExperimentsList from '~/pages/pipelines/global/experiments/ActiveExperimentsList';
import ArchivedExperimentsList from '~/pages/pipelines/global/experiments/ArchivedExperimentsList';
import { projectExperimentsRoute } from '~/routes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';

// type ProjectExperimentsProps = {
//   index?: string;
// };

const ProjectExperiments: React.FC = () => {
  const { pipelinesServer } = usePipelinesAPI();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const navigate = useNavigate();
  const { tab } = useParams();

  return (
    <DetailsSection
      objectType={ProjectObjectType.pipelineRun}
      id={ProjectSectionID.EXPERIMENTS_AND_RUNS}
      title={ProjectSectionTitles[ProjectSectionID.EXPERIMENTS_AND_RUNS]}
      description={experimentsPageDescription}
      isLoading={pipelinesServer.initializing}
      isEmpty={!pipelinesServer.installed}
      emptyState={<NoPipelineServer variant={ButtonVariant.primary} />}
      actions={[<PipelineServerActions key="actions" isDisabled={!pipelinesServer.installed} />]}
    >
      <EnsureAPIAvailability>
        <EnsureCompatiblePipelineServer>
          <PipelineAndVersionContextProvider>
            <Tabs
              activeKey={tab || ExperimentListTabs.ACTIVE}
              onSelect={(_event, selectedTab) => {
                navigate(projectExperimentsRoute(currentProject.metadata.name, `${selectedTab}`));
              }}
              aria-label="Experiments page tabs"
              role="region"
              className="odh-pipeline-runs-page-tabs"
              data-testid="experiments-global-tabs"
            >
              <Tab
                eventKey={ExperimentListTabs.ACTIVE}
                title={<TabTitleText>{ExperimentListTabTitle.ACTIVE}</TabTitleText>}
                aria-label="Active experiments tab"
                className="odh-pipeline-runs-page-tabs__content"
                data-testid="experiments-active-tab"
              >
                <PageSection
                  hasBodyWrapper={false}
                  isFilled
                  data-testid="experiments-active-tab-content"
                >
                  <ActiveExperimentsList />
                </PageSection>
              </Tab>
              <Tab
                eventKey={ExperimentListTabs.ARCHIVED}
                title={<TabTitleText>{ExperimentListTabTitle.ARCHIVED}</TabTitleText>}
                aria-label="Archived experiments tab"
                className="odh-pipeline-runs-page-tabs__content"
                data-testid="experiments-archived-tab"
              >
                <PageSection
                  hasBodyWrapper={false}
                  isFilled
                  data-testid="experiments-archived-tab-content"
                >
                  <ArchivedExperimentsList />
                </PageSection>
              </Tab>
            </Tabs>
          </PipelineAndVersionContextProvider>
        </EnsureCompatiblePipelineServer>
      </EnsureAPIAvailability>
    </DetailsSection>
  );
};

export default ProjectExperiments;
