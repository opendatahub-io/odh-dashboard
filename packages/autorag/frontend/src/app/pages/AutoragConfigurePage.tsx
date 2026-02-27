import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutoragConfigure from '../components/configure/AutoragConfigure';
import { useExperimentQuery } from '../hooks/queries';
import InvalidExperiment from '../components/empty-states/InvalidExperiment';

function AutoragConfigurePage(): React.JSX.Element {
  const { namespace, experimentId } = useParams();

  const { data: experiment, ...experimentQuery } = useExperimentQuery(experimentId);

  const invalidExperimentId = experimentQuery.isError;

  return (
    <ApplicationsPage
      title={experiment?.display_name}
      empty={invalidExperimentId}
      emptyStatePage={<InvalidExperiment />}
      loadError={experimentQuery.error ?? undefined}
      loaded={experimentQuery.isFetched}
      removeChildrenTopPadding
    >
      <AutoragConfigure namespace={namespace} />
    </ApplicationsPage>
  );
}

export default AutoragConfigurePage;
