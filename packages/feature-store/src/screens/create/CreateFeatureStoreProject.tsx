import React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import CreateFeatureStoreProjectWizard from './CreateFeatureStoreProjectWizard';
import useExistingFeatureStores from '../../hooks/useExistingFeatureStores';

const CreateFeatureStoreProject: React.FC = () => {
  const { loaded, error, existingProjectNames, hasUILabeledStore, primaryStore } =
    useExistingFeatureStores();

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ApplicationsPage
      title="Create feature store"
      description="Configure and deploy a new feature store."
      loaded
      empty={false}
      loadError={error}
    >
      <CreateFeatureStoreProjectWizard
        existingProjectNames={existingProjectNames}
        hasUILabeledStore={hasUILabeledStore}
        primaryStore={primaryStore}
      />
    </ApplicationsPage>
  );
};

export default CreateFeatureStoreProject;
