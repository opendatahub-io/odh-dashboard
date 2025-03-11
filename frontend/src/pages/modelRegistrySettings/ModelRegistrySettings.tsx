import React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useModelRegistriesBackend from '~/concepts/modelRegistrySettings/useModelRegistriesBackend';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { useContextResourceData } from '~/utilities/useContextResourceData';
import { RoleBindingKind } from '~/k8sTypes';
import ModelRegistriesTable from './ModelRegistriesTable';
import CreateModal from './CreateModal';
import useModelRegistryRoleBindings from './useModelRegistryRoleBindings';

const ModelRegistrySettings: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = React.useState(false);
  const [modelRegistries, mrloaded, loadError, refreshModelRegistries] =
    useModelRegistriesBackend();
  const roleBindings = useContextResourceData<RoleBindingKind>(useModelRegistryRoleBindings());
  const { refreshRulesReview } = React.useContext(ModelRegistrySelectorContext);
  const loaded = mrloaded && roleBindings.loaded;

  const refreshAll = React.useCallback(
    () => Promise.all([refreshModelRegistries(), refreshRulesReview()]),
    [refreshModelRegistries, refreshRulesReview],
  );

  return (
    <>
      <ApplicationsPage
        title={
          <TitleWithIcon
            title="Model registry settings"
            objectType={ProjectObjectType.modelRegistrySettings}
          />
        }
        description="Manage model registry settings for all users in your organization."
        loaded={loaded}
        loadError={loadError}
        errorMessage="Unable to load model registries."
        empty={modelRegistries.length === 0}
        emptyStatePage={
          <EmptyState
            headingLevel="h5"
            icon={PlusCircleIcon}
            titleText="No model registries"
            variant={EmptyStateVariant.lg}
            data-testid="mr-settings-empty-state"
          >
            <EmptyStateBody>
              To get started, create a model registry. You can manage permissions after creation.
            </EmptyStateBody>
            <EmptyStateFooter>
              <EmptyStateActions>
                <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                  Create model registry
                </Button>
              </EmptyStateActions>
            </EmptyStateFooter>
          </EmptyState>
        }
        provideChildrenPadding
      >
        <ModelRegistriesTable
          modelRegistries={modelRegistries}
          roleBindings={roleBindings}
          refresh={refreshAll}
          onCreateModelRegistryClick={() => {
            setCreateModalOpen(true);
          }}
        />
      </ApplicationsPage>
      {createModalOpen ? (
        <CreateModal onClose={() => setCreateModalOpen(false)} refresh={refreshAll} />
      ) : null}
    </>
  );
};

export default ModelRegistrySettings;
