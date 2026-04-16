import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { PageSection } from '@patternfly/react-core';
import { useListAuthPolicies } from '~/app/hooks/useListAuthPolicies';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import AuthPoliciesTable from './allAuthPolicies/AuthPoliciesTable';
import EmptyAuthPoliciesPage from './EmptyAuthPoliciesPage';
import DeleteAuthPolicyModal from './DeleteAuthPolicyModal';
import AuthPoliciesToolbar from './allAuthPolicies/AuthPoliciesToolbar';
import {
  AuthPoliciesFilterDataType,
  AuthPoliciesFilterOptions,
  initialAuthPoliciesFilterData,
} from './allAuthPolicies/const';

const AllAuthPoliciesPage: React.FC = () => {
  const [authPolicies, loaded, error, refresh] = useListAuthPolicies();
  const [deleteAuthPolicy, setDeleteAuthPolicy] = React.useState<MaaSAuthPolicy | undefined>(
    undefined,
  );
  const [filterData, setFilterData] = React.useState<AuthPoliciesFilterDataType>(
    initialAuthPoliciesFilterData,
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value?: string | { label: string; value: string }) =>
      setFilterData((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const onClearFilters = React.useCallback(() => setFilterData(initialAuthPoliciesFilterData), []);

  const filteredAuthPolicies = React.useMemo(() => {
    const keyword = filterData[AuthPoliciesFilterOptions.keyword]?.toLowerCase();
    const phase = filterData[AuthPoliciesFilterOptions.phase]?.toLowerCase();

    return authPolicies.filter((policy) => {
      if (keyword) {
        const displayedName = (policy.displayName ?? policy.name).toLowerCase();
        const keywordMatch =
          displayedName.includes(keyword) ||
          (policy.description ?? '').toLowerCase().includes(keyword);
        if (!keywordMatch) {
          return false;
        }
      }
      if (phase && !(policy.phase ?? '').toLowerCase().includes(phase)) {
        return false;
      }
      return true;
    });
  }, [authPolicies, filterData]);

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
            authPolicies={filteredAuthPolicies}
            setDeleteAuthPolicy={setDeleteAuthPolicy}
            onClearFilters={onClearFilters}
            toolbarContent={
              <AuthPoliciesToolbar filterData={filterData} onFilterUpdate={onFilterUpdate} />
            }
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
