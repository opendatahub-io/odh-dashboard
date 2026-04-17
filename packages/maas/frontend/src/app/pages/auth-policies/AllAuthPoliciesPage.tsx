import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import { useListAuthPolicies } from '~/app/hooks/useListAuthPolicies';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import AuthPoliciesTable from './allAuthPolicies/AuthPoliciesTable';
import EmptyAuthPoliciesPage from './EmptyAuthPoliciesPage';
import DeleteAuthPolicyModal from './DeleteAuthPolicyModal';
import AuthPoliciesToolbar from './allAuthPolicies/AuthPoliciesToolbar';

const AllAuthPoliciesPage: React.FC = () => {
  const [authPolicies, loaded, error, refresh] = useListAuthPolicies();
  const [deleteAuthPolicy, setDeleteAuthPolicy] = React.useState<MaaSAuthPolicy | undefined>(
    undefined,
  );
  return (
    <ApplicationsPage
      title="Authorization policies"
      description="Authorization policies, in combination with subscriptions, enable users to consume model endpoints through the API gateway."
      empty={loaded && !error && authPolicies.length === 0}
      emptyStatePage={<EmptyAuthPoliciesPage />}
      loaded={loaded}
      loadError={error}
    >
      {loaded && (
        <PageSection isFilled>
          <AuthPoliciesTable
            authPolicies={authPolicies}
            setDeleteAuthPolicy={setDeleteAuthPolicy}
            toolbarContent={<AuthPoliciesToolbar />}
          />
        </PageSection>
      )}
      {deleteAuthPolicy && (
        <DeleteAuthPolicyModal
          authPolicy={deleteAuthPolicy}
          onClose={(deleted?: boolean) => {
            if (deleted) {
              refresh();
            }
            setDeleteAuthPolicy(undefined);
          }}
        />
      )}
    </ApplicationsPage>
  );
};
export default AllAuthPoliciesPage;
