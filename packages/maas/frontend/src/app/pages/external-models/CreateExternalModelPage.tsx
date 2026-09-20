import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { useExternalModelsContext } from '~/app/context/ExternalModelsContext';
import { useExternalModelsNamespace } from '~/app/hooks/useExternalModelsNamespace';
import { AddProviderReferenceSource } from '~/app/types/event-tracking';
import CreateExternalModelForm from './CreateExternalModel/CreateExternalModelForm';
import { deploymentsExternalPath, getAddProviderReferenceSourceFromLocationState } from './const';

const CreateExternalModelPage: React.FC = () => {
  const location = useLocation();
  const { externalProvidersLoaded, externalProvidersError } = useExternalModelsContext();
  const { resolvedNamespace, namespacesLoaded, namespacesLoadError, shouldRedirect } =
    useExternalModelsNamespace();

  const addProviderReferenceSource =
    getAddProviderReferenceSourceFromLocationState(location.state) ??
    AddProviderReferenceSource.TOOLBAR;

  if (shouldRedirect && resolvedNamespace) {
    return <Navigate to={deploymentsExternalPath(resolvedNamespace)} replace />;
  }

  const returnTo = deploymentsExternalPath(resolvedNamespace ?? '');
  const loaded = namespacesLoaded && (externalProvidersLoaded || !!externalProvidersError);

  return (
    <ApplicationsPage
      title="Add external model"
      description="Register a model endpoint from a provider outside OpenShift AI by selecting a provider and configuring the model details. External models can reference multiple providers with weighted traffic routing for A/B testing or failover."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to={returnTo} data-testid="breadcrumb-external-models-link">
                External models
              </Link>
            )}
          />
          <BreadcrumbItem isActive>Add external model</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded}
      empty={false}
      loadError={namespacesLoadError || externalProvidersError}
    >
      {resolvedNamespace && (
        <CreateExternalModelForm
          namespace={resolvedNamespace}
          returnTo={returnTo}
          addProviderReferenceSource={addProviderReferenceSource}
        />
      )}
    </ApplicationsPage>
  );
};

export default CreateExternalModelPage;
