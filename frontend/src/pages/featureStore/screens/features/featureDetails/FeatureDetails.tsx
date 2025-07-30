import React from 'react';
import {
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Spinner,
} from '@patternfly/react-core';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import useFeatureByName from '#~/pages/featureStore/apiHooks/useFeatureByName.ts';
import FeatureDetailsTabs from './FeatureDetailsTab';

const FeatureDetails = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const { featureViewName, featureName } = useParams();
  const {
    data: feature,
    loaded: featureLoaded,
    error: featureLoadError,
  } = useFeatureByName(currentProject, featureViewName, featureName);

  if (featureLoadError) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Error loading feature details"
        variant={EmptyStateVariant.lg}
        data-id="error-empty-state"
      >
        <EmptyStateBody>{featureLoadError.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!featureLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ApplicationsPage
      empty={false}
      title={feature.name}
      description={feature.description}
      loadError={featureLoadError}
      loaded={featureLoaded}
      provideChildrenPadding
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem render={() => <Link to="/featureStore/features">Features</Link>} />
          <BreadcrumbItem
            data-testid="breadcrumb-version-name"
            isActive
            style={{
              textDecoration: 'underline',
              textUnderlineOffset: ExtraSmallSpacerSize.var,
            }}
          >
            {feature.name}
          </BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <FeatureDetailsTabs feature={feature} />
    </ApplicationsPage>
  );
};

export default FeatureDetails;
