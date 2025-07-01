import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useExperimentRuns from '#~/concepts/modelRegistry/apiHooks/useExperimentRuns';
import useExperimentById from '#~/concepts/modelRegistry/apiHooks/useExperimentById';
import { experimentsRoute } from '#~/routes/experiments/registryBase.ts';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext.tsx';
import ExperimentRunsListView from './ExperimentRunsListView';

type ExperimentRunsProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const ExperimentRuns: React.FC<ExperimentRunsProps> = ({ ...pageProps }) => {
  const { experimentId } = useParams<{ experimentId: string }>();
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);

  const [experiment, experimentLoaded, experimentLoadError] = useExperimentById(experimentId);
  const [experimentRunsData, experimentRunsLoaded, experimentRunsLoadError] =
    useExperimentRuns(experimentId);

  const experimentRuns = experimentRunsData.items;
  const loadError = experimentLoadError || experimentRunsLoadError;
  const loaded = experimentLoaded && experimentRunsLoaded;

  return (
    <ApplicationsPage
      {...pageProps}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to={experimentsRoute(preferredModelRegistry?.metadata.name, experimentId)}>
                Experiments - {preferredModelRegistry?.metadata.name}
              </Link>
            )}
          />
          <BreadcrumbItem data-testid="breadcrumb-model" isActive>
            Runs
          </BreadcrumbItem>
        </Breadcrumb>
      }
      title={experiment ? `${experiment.name} runs` : null}
      description={`Experiment runs for ${experiment?.name || 'this experiment'}`}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
    >
      <ExperimentRunsListView experimentRuns={experimentRuns} />
    </ApplicationsPage>
  );
};

export default ExperimentRuns;
