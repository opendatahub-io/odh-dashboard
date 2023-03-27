import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import MetricsPage from '~/pages/modelServing/screens/metrics/MetricsPage';
import { ModelServingMetricsProvider } from '~/pages/modelServing/screens/metrics/ModelServingMetricsContext';
import { getRuntimeMetricsQueries } from '~/pages/modelServing/screens/metrics/utils';
import NotFound from '~/pages/NotFound';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { getProjectDisplayName } from '~/pages/projects/utils';
import RuntimeGraphs from '~/pages/modelServing/screens/metrics/RuntimeGraphs';
import { MetricType } from '~/pages/modelServing/screens/types';

const ProjectInferenceMetricsWrapper: React.FC = () => {
  const {
    currentProject,
    servingRuntimes: { data: runtimes, loaded },
  } = React.useContext(ProjectDetailsContext);
  const runtime = runtimes[0];
  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }
  if (!runtime) {
    return <NotFound />;
  }
  const queries = getRuntimeMetricsQueries(runtime);
  const projectDisplayName = getProjectDisplayName(currentProject);

  return (
    <ModelServingMetricsProvider queries={queries} type={MetricType.RUNTIME}>
      <MetricsPage
        title={`ovm metrics`}
        breadcrumbItems={[
          { label: 'Data Science Projects', link: '/projects' },
          {
            label: projectDisplayName,
            link: `/projects/${currentProject.metadata.name}`,
          },
          {
            label: `ovm metrics`,
            isActive: true,
          },
        ]}
      >
        <RuntimeGraphs />
      </MetricsPage>
    </ModelServingMetricsProvider>
  );
};

export default ProjectInferenceMetricsWrapper;
