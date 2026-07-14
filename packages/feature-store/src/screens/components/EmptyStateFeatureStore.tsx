import React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { PlusCircleIcon, SearchIcon } from '@patternfly/react-icons';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import ConnectedWorkbenchesModal from '../../components/ConnectedWorkbenchesModal';
import IntegrationInstructionsPopover from '../../components/IntegrationInstructionsPopover';
import { useFeatureStoreProject } from '../../FeatureStoreContext';

type EmptyStateFeatureStoreType = {
  testid?: string;
  title: string;
  description: React.ReactNode;
  headerIcon?: React.ComponentType;
  customAction?: React.ReactNode;
  customActions?: React.ReactNode;
  variant?: EmptyStateVariant;
  headingLevel?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  bodyTestId?: string;
};

const EmptyStateFeatureStore: React.FC<EmptyStateFeatureStoreType> = ({
  testid,
  title,
  description,
  headerIcon,
  customAction,
  customActions,
  variant = EmptyStateVariant.sm,
  headingLevel,
  bodyTestId,
}) => (
  <EmptyState
    headingLevel={headingLevel}
    icon={headerIcon ?? PlusCircleIcon}
    titleText={title}
    variant={variant}
    data-testid={testid}
  >
    <EmptyStateBody data-testid={bodyTestId}>{description}</EmptyStateBody>
    <EmptyStateFooter>
      {customActions}
      {customAction && !customActions && <EmptyStateActions>{customAction}</EmptyStateActions>}
    </EmptyStateFooter>
  </EmptyState>
);

type FeatureStoreEmptyStateProps = {
  resourceTypeSingular: string;
  resourceTypePlural: string;
};

const getArticle = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/** Empty state for feature-store resource list pages (entities, features, etc.). */
export const FeatureStoreEmptyState: React.FC<FeatureStoreEmptyStateProps> = ({
  resourceTypeSingular,
  resourceTypePlural,
}) => {
  const [canCreateFeatureStore] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));
  const { currentProject } = useFeatureStoreProject();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <>
      <EmptyStateFeatureStore
        testid="empty-state-title"
        title={`No ${resourceTypePlural}`}
        headingLevel="h6"
        headerIcon={SearchIcon}
        variant={EmptyStateVariant.lg}
        bodyTestId="empty-state-body"
        description={
          canCreateFeatureStore ? (
            <>
              This feature store doesn&apos;t contain any {resourceTypePlural}. To add{' '}
              {resourceTypePlural}:
              <br />
              Ensure at least one project has permission to access this feature store.
              <br />
              Create {getArticle(resourceTypeSingular)} {resourceTypeSingular} from a workbench in
              an authorized project.
            </>
          ) : (
            <>
              This feature store doesn&apos;t contain any {resourceTypePlural}. To add{' '}
              {resourceTypePlural}, create them from a workbench connected to this feature store.
            </>
          )
        }
        customActions={
          <>
            {canCreateFeatureStore && (
              <EmptyStateActions>
                <Button
                  variant="link"
                  onClick={() => setIsModalOpen(true)}
                  data-testid="view-connected-workbenches-link"
                >
                  View connected workbenches
                </Button>
              </EmptyStateActions>
            )}
            <EmptyStateActions>
              <IntegrationInstructionsPopover
                trigger={
                  <Button variant="link" data-testid="learn-how-to-connect-link">
                    Learn how to connect
                  </Button>
                }
              />
            </EmptyStateActions>
          </>
        }
      />
      {isModalOpen && (
        <ConnectedWorkbenchesModal
          onClose={() => setIsModalOpen(false)}
          initialFeastProjectName={currentProject}
        />
      )}
    </>
  );
};

export default EmptyStateFeatureStore;
