import { ApplicationsPage } from 'mod-arch-shared';
import React from 'react';
import { useParams } from 'react-router';
import AutomlConfigure from '~/app/components/configure/AutomlConfigure';
import { useExperimentQuery } from '~/app/hooks/queries';
import InvalidExperiment from '~/app/components/empty-states/InvalidExperiment';

function AutomlConfigurePage(): React.JSX.Element {
  const { experimentId } = useParams();

  const { data: experiment, ...experimentQuery } = useExperimentQuery(experimentId);

  const invalidExperimentId = experimentQuery.isError || !experimentId;

  return (
    <ApplicationsPage
      title={experiment?.display_name}
      empty={invalidExperimentId}
      emptyStatePage={<InvalidExperiment />}
      loadError={!experimentId ? undefined : (experimentQuery.error ?? undefined)}
      loaded={experimentQuery.isFetched || !experimentId}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <AutomlConfigure />
    </ApplicationsPage>
  );
}

export default AutomlConfigurePage;
