import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { Navigate, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { getRole } from '#~/api';
import { RoleKind } from '#~/k8sTypes';
import CreateRolePage from './CreateRolePage';

const EditRolePage: React.FC = () => {
  const { namespace = '', roleName = '' } = useParams<{
    namespace: string;
    roleName: string;
  }>();

  const [role, setRole] = React.useState<RoleKind>();
  const [loaded, setLoaded] = React.useState(false);
  const [loadError, setLoadError] = React.useState<Error>();

  React.useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setLoadError(undefined);

    getRole(namespace, roleName)
      .then((data) => {
        if (!cancelled) {
          setRole(data);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e : new Error('Failed to load role'));
          setLoaded(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [namespace, roleName]);

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  if (loadError || !role) {
    if (loadError) {
      return (
        <ApplicationsPage loaded empty loadError={loadError} errorMessage="Unable to load role" />
      );
    }
    return <Navigate to={`/projects/${namespace}?section=roles`} replace />;
  }

  return <CreateRolePage existingRole={role} />;
};

export default EditRolePage;
