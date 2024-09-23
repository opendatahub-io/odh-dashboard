import React from 'react';

import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  Title,
  Alert,
  AlertActionCloseButton,
} from '@patternfly/react-core';

import { MetadataAnnotation } from '~/k8sTypes';
import useStorageClasses from '~/concepts/k8s/useStorageClasses';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { updateStorageClassConfig } from '~/services/StorageClassService';
import { ResponseStatus } from '~/types';
import { StorageClassesTable } from './StorageClassesTable';
import { getStorageClassConfig, isOpenshiftDefaultStorageClass } from './utils';

const StorageClassesPage: React.FC = () => {
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [storageClasses, storageClassesLoaded, storageClassesError, refreshStorageClasses] =
    useStorageClasses();
  const storageClassesWithoutConfigs = React.useMemo(
    () =>
      storageClasses.filter(
        (storageClass) =>
          !storageClass.metadata.annotations?.[MetadataAnnotation.OdhStorageClassConfig],
      ),
    [storageClasses],
  );

  const defaultStorageClass = storageClasses.find(
    (storageClass) =>
      isOpenshiftDefaultStorageClass(storageClass) ||
      getStorageClassConfig(storageClass)?.isDefault,
  );

  const updateStorageClasses = React.useCallback(
    async (updateRequests: Promise<ResponseStatus>[]) => {
      setIsUpdating(true);

      try {
        const updateResponses = await Promise.all(updateRequests);
        if (updateResponses.some((response) => response.success)) {
          await refreshStorageClasses();
        }

        if (!defaultStorageClass) {
          setIsAlertOpen(true);
        }
      } finally {
        setIsUpdating(false);
      }
    },
    [defaultStorageClass, refreshStorageClasses],
  );

  // Add storage class config annotations automatically for all storage classes without them
  React.useEffect(() => {
    if (storageClassesWithoutConfigs.length > 0) {
      const updateRequests = storageClassesWithoutConfigs.map((storageClass, index) => {
        const { metadata } = storageClass;
        const { name: storageClassName } = metadata;

        let isDefault = defaultStorageClass?.metadata.uid === metadata.uid;
        let isEnabled = isDefault;

        if (!defaultStorageClass) {
          isDefault = index === 0;
          isEnabled = true;
        }

        return updateStorageClassConfig(storageClassName, {
          isDefault,
          isEnabled,
          displayName: storageClassName,
        });
      });

      updateStorageClasses(updateRequests);
    }
  }, [defaultStorageClass, storageClassesWithoutConfigs, updateStorageClasses]);

  const emptyStatePage = (
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
          At least one OpenShift storage class is required to use OpenShift AI. Configure a storage
          class in OpenShift, or request that your admin configure one.
        </EmptyStateBody>
      </EmptyState>
    </PageSection>
  );

  return (
    <ApplicationsPage
      title="Storage classes"
      description="Manage your organization's OpenShift cluster storage class settings for usage within OpenShift AI. These settings do not impact the storage classes within OpenShift."
      loaded={storageClassesLoaded && !isUpdating}
      empty={storageClasses.length === 0}
      loadError={storageClassesError}
      errorMessage="Unable to load storage classes."
      emptyStatePage={emptyStatePage}
      provideChildrenPadding
    >
      {isAlertOpen && (
        <Alert
          variant="warning"
          isInline
          title="Review default storage class"
          actionClose={<AlertActionCloseButton onClose={() => setIsAlertOpen(false)} />}
        >
          Some OpenShift AI features won&apos;t work without a default storage class. No OpenShift
          default exists, so an OpenShift AI default was set automatically. Review the default
          storage class, and set a new one if needed.
        </Alert>
      )}
      <StorageClassesTable storageClasses={storageClasses} refresh={refreshStorageClasses} />
    </ApplicationsPage>
  );
};

export default StorageClassesPage;
