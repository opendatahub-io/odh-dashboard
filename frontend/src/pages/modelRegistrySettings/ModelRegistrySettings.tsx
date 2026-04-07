import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { AreaContext } from '#~/concepts/areas/AreaContext';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import RedirectErrorState from '#~/pages/external/RedirectErrorState';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import useModelRegistriesBackend from '#~/concepts/modelRegistrySettings/useModelRegistriesBackend';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import ModelRegistriesTable from './ModelRegistriesTable';
import CreateModal from './CreateModal';
import useModelRegistryRoleBindings from './useModelRegistryRoleBindings';

const ModelRegistrySettings: React.FC = () => {
  const { dscStatus } = React.useContext(AreaContext);
  const modelRegistryNamespace = dscStatus?.components?.modelregistry?.registriesNamespace;
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  const [modelRegistries, mrloaded, loadError, refreshModelRegistries] =
    useModelRegistriesBackend();
  const roleBindings = useModelRegistryRoleBindings();
  const { refreshRulesReview } = React.useContext(ModelRegistriesContext);
  const loaded = mrloaded && roleBindings.loaded;

  const refreshAll = React.useCallback(
    () => Promise.all([refreshModelRegistries(), roleBindings.refresh(), refreshRulesReview()]),
    [refreshModelRegistries, roleBindings, refreshRulesReview],
  );

  const error = !modelRegistryNamespace
    ? new Error('No registries namespace could be found')
    : null;

  if (!modelRegistryNamespace) {
    return (
      <ApplicationsPage loaded empty={false}>
        <RedirectErrorState title="Could not load component state" errorMessage={error?.message} />
      </ApplicationsPage>
    );
  }
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
