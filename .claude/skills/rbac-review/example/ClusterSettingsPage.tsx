import * as React from 'react';
import { Button, ButtonVariant, PageSection, Spinner } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useUser } from '#~/redux/selectors';
import useClusterSecrets from './useClusterSecrets';
import ClusterSettingsTable from './ClusterSettingsTable';

const ClusterSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUser();
  const [secrets, loaded, error] = useClusterSecrets();

  if (!loaded) {
    return <Spinner />;
  }

  return (
    <ApplicationsPage
      title="Cluster Settings"
      description="Manage cluster-wide configuration and secrets."
      loaded={loaded}
      loadError={error}
      empty={secrets.length === 0}
    >
      <PageSection>
        {isAdmin && (
          <Button
            variant={ButtonVariant.primary}
            onClick={() => navigate('/cluster-settings/create')}
          >
            Create setting
          </Button>
        )}
        <ClusterSettingsTable secrets={secrets} />
      </PageSection>
    </ApplicationsPage>
  );
};

export default ClusterSettingsPage;
