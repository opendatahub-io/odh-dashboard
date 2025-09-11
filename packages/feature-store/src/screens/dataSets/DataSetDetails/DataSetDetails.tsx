import React from 'react';
import {
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Spinner,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { PathMissingIcon, SearchIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import DataSetDetailsTabs from './DataSetDetailsTabs';
import useFeatureStoreDataSetByName from '../../../apiHooks/useFeatureStoreDataSetByName';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { featureStoreRootRoute } from '../../../routes';

const DataSetDetails = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const { dataSetName } = useParams();
  const {
    data: dataSet,
    loaded: dataSetLoaded,
    error: dataSetLoadError,
  } = useFeatureStoreDataSetByName(currentProject, dataSetName);

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No data sets"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No data sets have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );
  if (dataSetLoadError) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={PathMissingIcon}
        titleText="Error loading data set details"
        variant={EmptyStateVariant.lg}
        data-id="error-empty-state"
      >
        <EmptyStateBody>
          {dataSetLoadError.message || 'The requested data set could not be found.'}
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Link to={`${featureStoreRootRoute()}/dataSets`}>Go to Data Sets</Link>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  if (!dataSetLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ApplicationsPage
      empty={!dataSetLoaded}
      emptyStatePage={emptyState}
      title={dataSet.spec.name}
      description={dataSet.spec.description}
      loadError={dataSetLoadError}
      loaded={dataSetLoaded}
      provideChildrenPadding
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            data-testid="data-set-details-breadcrumb-link"
            render={() => <Link to={`${featureStoreRootRoute()}/dataSets`}>Datasets</Link>}
          />
          <BreadcrumbItem
            data-testid="data-set-details-breadcrumb-item"
            isActive
            style={{
              textDecoration: 'underline',
              textUnderlineOffset: ExtraSmallSpacerSize.var,
            }}
          >
            {dataSet.spec.name}
          </BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <DataSetDetailsTabs dataSet={dataSet} />
    </ApplicationsPage>
  );
};

export default DataSetDetails;
