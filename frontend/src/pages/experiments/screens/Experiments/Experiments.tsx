import React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage.tsx';
import useExperiments from '#~/concepts/modelRegistry/apiHooks/useExperiments.ts';
import ModelRegistrySelectorNavigator from '#~/concepts/modelRegistry/content/ModelRegistrySelectorNavigator.tsx';
import { experimentsRunsRoute } from '#~/routes/experiments/registryBase.ts';
import ExperimentsListView from './ExperimentsListView';

type ExperimentsProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const Experiments: React.FC<ExperimentsProps> = ({ ...pageProps }) => {
  const [experimentsData, experimentsLoaded, experimentsLoadError] = useExperiments();

  const experiments = experimentsData.items;
  const loadError = experimentsLoadError;
  const loaded = experimentsLoaded;

  return (
    <ApplicationsPage
      {...pageProps}
      headerContent={
        <ModelRegistrySelectorNavigator
          getRedirectPath={(modelRegistryName) => experimentsRunsRoute(modelRegistryName)}
        />
      }
      title="Experiments"
      description="Model registry experiments"
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
    >
      <ExperimentsListView experiments={experiments} />
    </ApplicationsPage>
  );
};

export default Experiments;
