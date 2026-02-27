import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutoragConfigure from '../components/configure/AutoragConfigure';
import { useExperimentQuery } from '../hooks/queries';
import { autoragExperimentsPathname } from '../utilities/routes';
import InvalidExperiment from '../components/empty-states/InvalidExperiment';
import InvalidProject from '../components/empty-states/InvalidProject';

function AutoragConfigurePage(): React.JSX.Element {
  const { namespace, experimentId } = useParams();

  const { data: experiment, ...experimentQuery } = useExperimentQuery(experimentId);

  const invalidExperimentId = experimentQuery.isError;

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}/${experimentId}`;

  return (
    <ApplicationsPage
      title={experiment?.display_name}
      empty={invalidExperimentId || !namespace}
      emptyStatePage={
        !namespace ? (
          <InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />
        ) : (
          <InvalidExperiment />
        )
      }
      loadError={experimentQuery.error ?? undefined}
      loaded={experimentQuery.isFetched}
      removeChildrenTopPadding
    >
      {namespace && <AutoragConfigure namespace={namespace} />}
    </ApplicationsPage>
  );
}

export default AutoragConfigurePage;
