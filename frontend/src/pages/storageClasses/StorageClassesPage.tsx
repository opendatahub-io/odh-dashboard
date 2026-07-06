import React from 'react';
import {
  EmptyState,
  EmptyStateVariant,
  EmptyStateBody,
  PageSection,
  Title,
  EmptyStateFooter,
} from '@patternfly/react-core';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import useStorageClasses from '#~/concepts/k8s/useStorageClasses';
import WhosMyAdministrator from '#~/components/WhosMyAdministrator';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ODH_PRODUCT_NAME } from '#~/utilities/const.ts';
import { StorageClassesTable } from './StorageClassesTable';
import { StorageClassContextProvider, useStorageClassContext } from './StorageClassesContext';

interface StorageClassesPageInternalProps {
  loaded: boolean;
  error: Error | undefined;
}

const StorageClassesPageInternal: React.FC<StorageClassesPageInternalProps> = ({
  loaded,
  error,
}) => {
  const { storageClasses } = useStorageClassContext();
  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="Storage classes" objectType={ProjectObjectType.storageClasses} />
      }
      description={`Manage your organization's OpenShift cluster storage class settings for usage within ${ODH_PRODUCT_NAME}. These settings do not impact the storage classes within OpenShift.`}
      loaded={loaded}
      empty={storageClasses.length === 0}
      loadError={error}
      errorMessage="Unable to load storage classes."
      emptyStatePage={
        <PageSection hasBodyWrapper={false} isFilled>
          <EmptyState
            titleText={
              <Title headingLevel="h5" size="lg">
                Configure storage classes
              </Title>
            }
            variant={EmptyStateVariant.lg}
            data-testid="storage-classes-empty-state"
          >
            <img
              width="60px"
              height="60px"
              src={typedEmptyImage(ProjectObjectType.storageClasses)}
              alt=""
              className="pf-v6-u-mb-sm"
            />

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
      <StorageClassesTable />
    </ApplicationsPage>
  );
};

const StorageClassesPage: React.FC = () => {
  const [storageClasses, storageClassesLoaded, error, refresh] = useStorageClasses();

  return (
    <StorageClassContextProvider storageClasses={storageClasses} refresh={refresh}>
      <StorageClassesPageInternal loaded={storageClassesLoaded} error={error} />
    </StorageClassContextProvider>
  );
};

export default StorageClassesPage;
