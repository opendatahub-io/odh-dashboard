import React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  Title,
  Alert,
  AlertActionCloseButton,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useStorageClasses from '~/concepts/k8s/useStorageClasses';
import WhosMyAdministrator from '~/components/WhosMyAdministrator';
import { StorageClassesTable } from './StorageClassesTable';
import { StorageClassContextProvider, useStorageClassContext } from './StorageClassesContext';

interface StorageClassesPageInternalProps {
  loaded: boolean;
  error: Error | undefined;
  alert: React.ReactNode;
}

const StorageClassesPageInternal: React.FC<StorageClassesPageInternalProps> = ({
  loaded,
  error,
  alert,
}) => {
  const { isUpdatingConfigs, storageClasses } = useStorageClassContext();

  return (
    <ApplicationsPage
      title="Storage classes"
      description="Manage your organization's OpenShift cluster storage class settings for usage within OpenShift AI. These settings do not impact the storage classes within OpenShift."
      loaded={loaded && !isUpdatingConfigs}
      empty={storageClasses.length === 0}
      loadError={error}
      errorMessage="Unable to load storage classes."
      emptyStatePage={
        <PageSection isFilled>
          <EmptyState variant={EmptyStateVariant.lg} data-testid="storage-classes-empty-state">
            <img
              width="60px"
              height="60px"
              src={typedEmptyImage(ProjectObjectType.storageClasses)}
              alt=""
              className="pf-v5-u-mb-sm"
            />

            <Title headingLevel="h5" size="lg">
              Configure storage classes
            </Title>
            <EmptyStateBody>
              At least one OpenShift storage class is required to use OpenShift AI. Configure a
              storage class in OpenShift, or request that your admin configure one.
            </EmptyStateBody>
            <EmptyStateFooter>
              <WhosMyAdministrator />
            </EmptyStateFooter>
          </EmptyState>
        </PageSection>
      }
      provideChildrenPadding
    >
      {alert}
      <StorageClassesTable />
    </ApplicationsPage>
  );
};

const StorageClassesPage: React.FC = () => {
  const [storageClasses, storageClassesLoaded, error, refresh] = useStorageClasses();

  return (
    <StorageClassContextProvider
      storageClasses={storageClasses}
      loaded={storageClassesLoaded}
      refresh={refresh}
    >
      {(isAlertOpen, setIsAlertOpen) => (
        <StorageClassesPageInternal
          loaded={storageClassesLoaded}
          error={error}
          alert={
            isAlertOpen && (
              <Alert
                variant="warning"
                isInline
                title="Review default storage class"
                actionClose={<AlertActionCloseButton onClose={() => setIsAlertOpen(false)} />}
              >
                Some OpenShift AI features won&apos;t work without a default storage class. No
                OpenShift default exists, so an OpenShift AI default was set automatically. Review
                the default storage class, and set a new one if needed.
              </Alert>
            )
          }
        />
      )}
    </StorageClassContextProvider>
  );
};

export default StorageClassesPage;
