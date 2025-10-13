import * as React from 'react';
import { CogIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { ProjectObjectType, typedEmptyImage, WhosMyAdministrator } from 'mod-arch-shared';
import EmptyModelRegistryState from '~/app/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import ModelRegistryCoreLoader from '~/app/pages/modelRegistry/ModelRegistryCoreLoader';

type OdhModelRegistryCoreLoaderProps = {
  getInvalidRedirectPath: (modelRegistry: string) => string;
  isAdminUser?: boolean;
};

/**
 * ODH-specific override of ModelRegistryCoreLoader that includes admin user detection
 * for showing appropriate empty states when no model registries are available.
 */
const OdhModelRegistryCoreLoader: React.FC<OdhModelRegistryCoreLoaderProps> = ({
  getInvalidRedirectPath,
  isAdminUser = false, // Default to false if not provided
}) => {
  // Create the ODH-specific empty state based on admin status from wrapper
  const adminTitle = 'Create a model registry';
  const adminDescription =
    'No model registries are available to users in your organization. Create a model registry from the Model registry settings page.';

  const userTitle = 'Request access to model registries';
  const userDescription =
    'To request a new model registry, or to request permission to access an existing model registry, contact your administrator.';

  const odhEmptyStatePage = (
    <EmptyModelRegistryState
      testid="empty-model-registries-state"
      title={isAdminUser ? adminTitle : userTitle}
      description={isAdminUser ? adminDescription : userDescription}
      headerIcon={() =>
        !isAdminUser ? (
          <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
        ) : (
          <CogIcon />
        )
      }
      customAction={
        !isAdminUser ? (
          <WhosMyAdministrator />
        ) : (
          <Link to="/settings/model-resources-operations/model-registry">
            Go to <b>Model registry settings</b>
          </Link>
        )
      }
    />
  );

  return (
    <ModelRegistryCoreLoader
      getInvalidRedirectPath={getInvalidRedirectPath}
      emptyStatePage={odhEmptyStatePage}
    />
  );
};

export default OdhModelRegistryCoreLoader;
