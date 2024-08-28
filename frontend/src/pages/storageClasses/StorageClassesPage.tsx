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

import { MetadataAnnotation, StorageClassConfig } from '~/k8sTypes';
import useStorageClasses from '~/concepts/k8s/useStorageClasses';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { updateStorageClassConfig } from '~/services/StorageClassService';
import { getStorageClassConfig, isOpenshiftDefaultStorageClass } from './utils';

const StorageClassesPage: React.FC = () => {
  const [storageClasses, storageClassesLoaded, storageClassesError] = useStorageClasses();
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);

  const defaultStorageClass = storageClasses.find(
    (storageClass) =>
      isOpenshiftDefaultStorageClass(storageClass) ||
      getStorageClassConfig(storageClass)?.isDefault,
  );

  // Add storage class config annotations automatically for all storage classes without them
  React.useEffect(() => {
    storageClasses.forEach(async (storageClass, index) => {
      const { metadata } = storageClass;
      const { name: storageClassName } = metadata;

      if (!metadata.annotations?.[MetadataAnnotation.OdhStorageClassConfig]) {
        let isDefault = defaultStorageClass?.metadata.uid === metadata.uid;
        let isEnabled = false;

        if (!defaultStorageClass) {
          isDefault = index === 0;
          isEnabled = true;
        }

        const storageClassConfig: StorageClassConfig = {
          isDefault,
          isEnabled,
          displayName: storageClassName,
          lastModified: new Date().toISOString(),
        };

        await updateStorageClassConfig(storageClassName, storageClassConfig);
        setIsAlertOpen(!defaultStorageClass?.metadata.name);
      }
    });
  }, [defaultStorageClass, storageClasses]);

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
      loaded={storageClassesLoaded}
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

      {/* TODO, https://issues.redhat.com/browse/RHOAIENG-1106 */}
    </ApplicationsPage>
  );
};

export default StorageClassesPage;
