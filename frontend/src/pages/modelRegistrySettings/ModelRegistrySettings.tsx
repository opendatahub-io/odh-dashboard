import React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ApplicationsPage from '~/pages/ApplicationsPage';
import CreateModal from './CreateModal';

const ModelRegistrySettings: React.FC = () => {
  const [createModalOpen, setCreateModalOpen] = React.useState(false);

  return (
    <ApplicationsPage
      title="Model Registry Settings"
      description="Manage model registry settings for all users in your organization."
      loaded
      empty={false}
      errorMessage="Unable to load model registry settings."
      emptyMessage="No model registry settings found."
      provideChildrenPadding
    >
      <EmptyState variant={EmptyStateVariant.lg}>
        <EmptyStateHeader
          titleText="No model registries"
          icon={<EmptyStateIcon icon={PlusCircleIcon} />}
          headingLevel="h5"
        />
        <EmptyStateBody>
          You can create model registries for specific users or projects.
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
              Create model registry
            </Button>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
      <CreateModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </ApplicationsPage>
  );
};

export default ModelRegistrySettings;
