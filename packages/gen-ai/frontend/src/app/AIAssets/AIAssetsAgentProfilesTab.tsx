import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import NoData from '~/app/EmptyStates/NoData';
import useFetchAgentProfiles from '~/app/hooks/useFetchAgentProfiles';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import AgentProfilesTable from '~/app/AIAssets/components/agentprofiles/AgentProfilesTable';

const AIAssetsAgentProfilesTab: React.FC = () => {
  const { data: profiles = [], loaded, error, refresh } = useFetchAgentProfiles();
  const { api, apiAvailable } = useGenAiAPI();

  const handleDelete = React.useCallback(
    async (profileId: string) => {
      if (!apiAvailable) {
        throw new Error('API not available');
      }
      await api.deleteAgentProfile({ id: profileId });
      refresh();
    },
    [api, apiAvailable, refresh],
  );

  if (!loaded && !error) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (error) {
    return (
      <NoData
        title="Unable to load agent profiles"
        description="There was a problem loading agent profiles. Try refreshing the page or contact your cluster administrator."
      />
    );
  }

  if (profiles.length === 0) {
    return (
      <NoData
        title="No agent profiles"
        description="Save a playground configuration as an agent profile to see it listed here."
      />
    );
  }

  return <AgentProfilesTable profiles={profiles} onDelete={handleDelete} onRefresh={refresh} />;
};

export default AIAssetsAgentProfilesTab;
