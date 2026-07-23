import * as React from 'react';
import { Bullseye, Spinner } from '@patternfly/react-core';
import { Navigate, useParams } from 'react-router-dom';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { getRole } from '#~/api';
import { RoleKind } from '#~/k8sTypes';
import CreateRolePage from './CreateRolePage';

const DuplicateRolePage: React.FC = () => {
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

  const sourceDisplayName = getDisplayNameFromK8sResource(role);

  const duplicateRole: RoleKind = {
    ...role,
    metadata: {
      ...role.metadata,
      name: '',
      resourceVersion: undefined,
      uid: undefined,
      creationTimestamp: undefined,
      annotations: {
        ...role.metadata.annotations,
        'openshift.io/display-name': `Copy of ${sourceDisplayName}`,
      },
    },
  };

  return <CreateRolePage duplicateRole={duplicateRole} />;
};

export default DuplicateRolePage;
