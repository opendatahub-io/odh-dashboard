import * as React from 'react';
import { Alert, Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import { useModelsOverview } from '~/app/hooks/useModelsOverview';
import { URL_PREFIX } from '~/app/utilities/const';
import OverviewTable from './overview/OverviewTable';
import OverviewToolbar from './overview/OverviewToolbar';
import { initialOverviewFilterData, OverviewFilterDataType } from './overview/const';
import { filterOverviewModels } from './overview/utils';

const OVERVIEW_RETURN_TO = `${URL_PREFIX}/subscription-management/overview`;

const OverviewTab: React.FC = () => {
  const [rows, loaded, error] = useModelsOverview();
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
