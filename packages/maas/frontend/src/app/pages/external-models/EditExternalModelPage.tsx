import React from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Breadcrumb, BreadcrumbItem } from '@patternfly/react-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { useExternalModelsContext } from '~/app/context/ExternalModelsContext';
import { useExternalModelsNamespace } from '~/app/hooks/useExternalModelsNamespace';
import CreateExternalModelForm from './CreateExternalModel/CreateExternalModelForm';
import { deploymentsExternalPath } from './const';

const EditExternalModelPage: React.FC = () => {
  const { modelName = '' } = useParams<{ modelName: string }>();
  const { externalProvidersLoaded, externalProvidersError, externalModels, externalModelsLoaded } =
    useExternalModelsContext();
  const { resolvedNamespace, namespacesLoaded, namespacesLoadError, shouldRedirect } =
    useExternalModelsNamespace();

  if (shouldRedirect && resolvedNamespace) {
    return <Navigate to={deploymentsExternalPath(resolvedNamespace)} replace />;
  }

  const returnTo = deploymentsExternalPath(resolvedNamespace ?? '');
  const loaded =
    namespacesLoaded &&
    externalModelsLoaded &&
    (externalProvidersLoaded || !!externalProvidersError);
  const externalModel = externalModels.find((model) => model.name === modelName);
  const displayName = externalModel?.displayName ?? modelName;

  return (
    <ApplicationsPage
      title="Edit external model"
      description={
        <>
          Update the configuration for <strong>{displayName}</strong>.
        </>
      }
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to={returnTo} data-testid="breadcrumb-external-models-link">
                External models
              </Link>
            )}
          />
          <BreadcrumbItem isActive>{`Edit ${displayName}`}</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded={loaded || !!(namespacesLoadError || externalProvidersError)}
      empty={loaded && !externalModel}
      loadError={namespacesLoadError || externalProvidersError}
      errorMessage="Unable to load external model."
    >
      {resolvedNamespace && externalModel && (
        <CreateExternalModelForm
          key={`${resolvedNamespace}/${externalModel.name}`}
          namespace={resolvedNamespace}
          returnTo={returnTo}
          externalModel={externalModel}
        />
      )}
    </ApplicationsPage>
  );
};

export default EditExternalModelPage;
