import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutoRagConfigure from '../components/configure/AutoRagConfigure';
import { useExperimentQuery } from '../hooks/queries';
import InvalidExperiment from '../components/empty-states/InvalidExperiment';

function AutoRagConfigurePage(): React.JSX.Element {
  const { experimentId } = useParams();

  const { data: experiment, ...experimentQuery } = useExperimentQuery(experimentId);

  const invalidExperimentId = experimentQuery.isError;

  return (
    <ApplicationsPage
      title={experiment?.display_name}
      empty={invalidExperimentId}
      emptyStatePage={<InvalidExperiment />}
      loadError={experimentQuery.error ?? undefined}
      loaded={!experimentQuery.isLoading}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <AutoRagConfigure />
    </ApplicationsPage>
  );
}

export default AutoRagConfigurePage;
