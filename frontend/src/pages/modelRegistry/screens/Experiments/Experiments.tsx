import React from 'react';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext.tsx';
import ApplicationsPage from '#~/pages/ApplicationsPage.tsx';
import useExperiments from '#~/concepts/modelRegistry/apiHooks/useExperiments.ts';
import ExperimentsListView from './ExperimentsListView';

type ExperimentsProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  'breadcrumb' | 'title' | 'description' | 'loadError' | 'loaded' | 'provideChildrenPadding'
>;

const Experiments: React.FC<ExperimentsProps> = ({ ...pageProps }) => {
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const [experimentsData, experimentsLoaded, experimentsLoadError] = useExperiments();

  const experiments = experimentsData.items;
  const loadError = experimentsLoadError;
  const loaded = experimentsLoaded;

  return (
    <ApplicationsPage
      {...pageProps}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to="/modelRegistry">
                Model registry - {preferredModelRegistry?.metadata.name}
              </Link>
            )}
          />
          <BreadcrumbItem data-testid="breadcrumb-model" isActive>
            Experiments
          </BreadcrumbItem>
        </Breadcrumb>
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
