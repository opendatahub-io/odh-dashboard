import React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import { verbModelAccess } from '@odh-dashboard/internal/concepts/userSSAR/utils';
import ConnectedWorkbenchesModal from './ConnectedWorkbenchesModal';
import IntegrationInstructionsPopover from './IntegrationInstructionsPopover';
import { useFeatureStoreProject } from '../FeatureStoreContext';

type FeatureStoreEmptyStateProps = {
  resourceTypeSingular: string;
  resourceTypePlural: string;
};

const getArticle = (word: string): string => (/^[aeiou]/i.test(word) ? 'an' : 'a');

const FeatureStoreEmptyState: React.FC<FeatureStoreEmptyStateProps> = ({
  resourceTypeSingular,
  resourceTypePlural,
}) => {
  const [isAdmin] = useAccessAllowed(verbModelAccess('create', FeatureStoreModel));
  const { currentProject } = useFeatureStoreProject();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  return (
    <>
      <EmptyState
        headingLevel="h6"
        icon={SearchIcon}
        titleText={`No ${resourceTypePlural}`}
        variant={EmptyStateVariant.lg}
        data-testid="empty-state-title"
      >
        <EmptyStateBody data-testid="empty-state-body">
          {isAdmin ? (
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
          )}
        </EmptyStateBody>
        <EmptyStateFooter style={{ gap: 0 }}>
          {isAdmin && (
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
        </EmptyStateFooter>
      </EmptyState>
      {isModalOpen && (
        <ConnectedWorkbenchesModal
          onClose={() => setIsModalOpen(false)}
          initialFeastProjectName={currentProject}
        />
      )}
    </>
  );
};

export default FeatureStoreEmptyState;
