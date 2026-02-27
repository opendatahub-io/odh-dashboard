import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';
import { useExperimentQuery } from '~/app/hooks/queries';
import InvalidExperiment from '~/app/components/empty-states/InvalidExperiment';

function AutoragConfigurePage(): React.JSX.Element {
  const { experimentId } = useParams();

  const { data: experiment, ...experimentQuery } = useExperimentQuery(experimentId);

  const invalidExperimentId = experimentQuery.isError;

  return (
    <ApplicationsPage
      title={experiment?.display_name}
      empty={invalidExperimentId}
      emptyStatePage={<InvalidExperiment />}
      loadError={experimentQuery.error ?? undefined}
      loaded={experimentQuery.isFetched}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <AutoragConfigure />
    </ApplicationsPage>
  );
}

export default AutoragConfigurePage;
