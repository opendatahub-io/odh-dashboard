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
import FeatureStorePageTitle from '../../../components/FeatureStorePageTitle';
import FeatureStoreBreadcrumb from '../../components/FeatureStoreBreadcrumb';
import FeatureStoreAccessDenied from '../../../components/FeatureStoreAccessDenied';
import { isNotFoundError } from '../../../utils';
import { getFeatureStoreErrorMessage } from '../../../api/errorUtils';

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

  const errorState = (
    <EmptyState
      headingLevel="h6"
      icon={PathMissingIcon}
      titleText="Data set not found"
      variant={EmptyStateVariant.lg}
      data-testid="error-state-title"
    >
      <EmptyStateBody data-testid="error-state-body">
        {getFeatureStoreErrorMessage(
          dataSetLoadError,
          'The requested data set could not be found.',
        )}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Link to={`${featureStoreRootRoute()}/datasets`}>Go to Data Sets</Link>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );

  const loadErrorState = isNotFoundError(dataSetLoadError) ? (
    errorState
  ) : (
    <FeatureStoreAccessDenied resourceType="data set" projectName={currentProject} />
  );

  if (!dataSetLoaded && !dataSetLoadError) {
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
      loadErrorPage={dataSetLoadError ? loadErrorState : undefined}
      loaded={dataSetLoaded}
      provideChildrenPadding
      breadcrumb={
        <FeatureStorePageTitle
          isDetailsPage
          breadcrumb={
            <Breadcrumb>
              <FeatureStoreBreadcrumb
                pageName="Datasets"
                projectName={currentProject || ''}
                linkTo={`${featureStoreRootRoute()}/datasets`}
                dataTestId="data-set-details-breadcrumb-link"
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
        />
      }
    >
      <DataSetDetailsTabs dataSet={dataSet} />
    </ApplicationsPage>
  );
};

export default DataSetDetails;
