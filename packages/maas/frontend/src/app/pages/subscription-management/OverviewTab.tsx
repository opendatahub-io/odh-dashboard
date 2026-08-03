import * as React from 'react';
import { Alert, Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import { useMaaSGovernanceContext } from '~/app/context/MaaSGovernanceContext';
import { URL_PREFIX } from '~/app/utilities/const';
import OverviewTable from './overview/OverviewTable';
import OverviewToolbar from './overview/OverviewToolbar';
import { initialOverviewFilterData, OverviewFilterDataType } from './overview/const';
import { filterOverviewModels } from './overview/utils';
import EmptyStatePage from './EmptyStatePage';

const OVERVIEW_RETURN_TO = `${URL_PREFIX}/maas-governance/overview`;

const OverviewTab: React.FC = () => {
  const {
    overviewRows: rows,
    overviewLoaded: loaded,
    overviewError: error,
    modelRefs,
    subscriptions,
    policies,
  } = useMaaSGovernanceContext();
  const [filterData, setFilterData] =
    React.useState<OverviewFilterDataType>(initialOverviewFilterData);

  const onFilterUpdate = React.useCallback(
    (key: string, value?: string | { label: string; value: string }) =>
      setFilterData((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const onClearFilters = React.useCallback(() => setFilterData(initialOverviewFilterData), []);

  const filteredRows = React.useMemo(
    () => filterOverviewModels(rows, filterData),
    [rows, filterData],
  );

  if (!loaded && !error) {
    return (
      <PageSection isFilled>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </PageSection>
    );
  }

  if (error) {
    return (
      <PageSection isFilled>
        <Alert variant="danger" isInline title="Error loading overview data">
          {error.message}
        </Alert>
      </PageSection>
    );
  }

  if (rows.length === 0) {
    const hasGovernanceResources = subscriptions.length > 0 || policies.length > 0;
    const noModels = modelRefs.length === 0;
    return (
      <PageSection isFilled>
        <EmptyStatePage
          returnTo={OVERVIEW_RETURN_TO}
          title={
            noModels && hasGovernanceResources
              ? 'No registered MaaS models'
              : 'No subscriptions or policies configured'
          }
          bodyText={
            noModels && hasGovernanceResources
              ? 'Subscriptions or authorization policies exist, but there are no registered MaaS models to show in the overview.'
              : 'Create subscriptions to define rate limits and authorization policies to control which groups can access MaaS models.'
          }
          showSubsButton
          showPoliciesButton
          testId="empty-overview-page"
        />
      </PageSection>
    );
  }

  return (
    <PageSection isFilled>
      <OverviewTable
        data={filteredRows}
        onClearFilters={onClearFilters}
        toolbarContent={
          <OverviewToolbar
            filterData={filterData}
            onFilterUpdate={onFilterUpdate}
            returnTo={OVERVIEW_RETURN_TO}
          />
        }
      />
    </PageSection>
  );
};

export default OverviewTab;
