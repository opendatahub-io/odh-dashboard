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
      title="Auth Policies"
      description="Auth Policies are used to control access to the API."
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
          onClose={() => {
            setDeleteAuthPolicy(undefined);
            refresh();
          }}
        />
      )}
    </ApplicationsPage>
  );
};
export default AllAuthPoliciesPage;
