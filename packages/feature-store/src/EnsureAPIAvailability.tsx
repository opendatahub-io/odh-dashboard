import * as React from 'react';
import { EmptyState, EmptyStateVariant, PageSection, Spinner } from '@patternfly/react-core';
import { useFeatureStoreAPI } from './FeatureStoreContext';
import { useFeatureStoreCR } from './apiHooks/useFeatureStoreCR';

type EnsureFeatureStoreAPIAvailabilityProps = {
  children: React.ReactNode;
};

const EnsureFeatureStoreAPIAvailability: React.FC<EnsureFeatureStoreAPIAvailabilityProps> = ({
  children,
}) => {
  const { apiAvailable } = useFeatureStoreAPI();
  const { data: featureStoreCR, loaded: crLoaded, error: crError } = useFeatureStoreCR();

  if (apiAvailable) {
    return <>{children}</>;
  }

  if (crError || (crLoaded && !featureStoreCR)) {
    return <>{children}</>;
  }

  return (
    <PageSection hasBodyWrapper={false} isFilled aria-live="polite" aria-busy>
      <EmptyState
        headingLevel="h1"
        titleText="Loading"
        variant={EmptyStateVariant.lg}
        data-id="loading-empty-state"
      >
        <Spinner size="xl" aria-label="Loading feature store API" />
      </EmptyState>
    </PageSection>
  );
};

export default EnsureFeatureStoreAPIAvailability;
