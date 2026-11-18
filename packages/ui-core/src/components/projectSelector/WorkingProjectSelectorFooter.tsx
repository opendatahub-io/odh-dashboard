import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { Alert, Button, Flex, FlexItem, ModalFooter } from '@patternfly/react-core';
import DashboardModalFooter from '../DashboardModalFooter';
import {
  WorkingProjectStatusValue,
  type ProjectIdentity,
  type WorkingProjectStatus,
} from '../../context/WorkingProjectContext';

type Props = {
  isEmptyProjectList: boolean;
  manualFallback: boolean;
  showManualEmptyContent: boolean;
  canSelectProject: boolean;
  status: WorkingProjectStatus;
  projects: readonly ProjectIdentity[];
  selectedProject?: ProjectIdentity;
  selectedName: string;
  activeProject?: ProjectIdentity | null;
  selecting: boolean;
  hasUserSelectedProject: boolean;
  selectionError?: Error;
  onSubmit: () => void;
  onClose: () => void;
  onCreateProject?: () => void;
  onAddProject?: () => void;
};

const WorkingProjectSelectorFooter: React.FC<Props> = ({
  isEmptyProjectList,
  manualFallback,
  showManualEmptyContent,
  canSelectProject,
  status,
  projects,
  selectedProject,
  selectedName,
  activeProject,
  selecting,
  hasUserSelectedProject,
  selectionError,
  onSubmit,
  onClose,
  onCreateProject,
  onAddProject,
}) => {
  if (isEmptyProjectList || showManualEmptyContent) {
    return null;
  }

  if (manualFallback) {
    return (
      <ModalFooter>
        <DashboardModalFooter
          submitLabel="Select"
          isSubmitDisabled={!selectedProject || selectedName === activeProject?.name || selecting}
          isSubmitLoading={selecting}
          isCancelDisabled={selecting}
          onSubmit={onSubmit}
          error={selectionError}
          alertTitle="Unable to change working project"
          secondaryActions={
            onAddProject ? (
              <Button variant="secondary" isDisabled={selecting} onClick={onAddProject}>
                Add project
              </Button>
            ) : undefined
          }
          onCancel={onClose}
        />
      </ModalFooter>
    );
  }

  return (
    <ModalFooter>
      {selectionError && (
        <Alert
          data-testid="error-message-alert"
          isInline
          variant="danger"
          title="Unable to change working project"
        >
          {selectionError.message}
        </Alert>
      )}
      <Flex className="pf-v6-u-w-100" gap={{ default: 'gapMd' }}>
        {onCreateProject && status === WorkingProjectStatusValue.Listed && !canSelectProject && (
          <FlexItem>
            <Button
              variant="secondary"
              isDisabled={selecting}
              onClick={() => {
                onClose();
                onCreateProject();
              }}
            >
              Create project
            </Button>
          </FlexItem>
        )}
        {onAddProject &&
          status === WorkingProjectStatusValue.ListingUnavailable &&
          projects.length > 0 && (
            <FlexItem>
              <Button variant="secondary" isDisabled={selecting} onClick={onAddProject}>
                Add project
              </Button>
            </FlexItem>
          )}
        <FlexItem>
          {canSelectProject ? (
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
              <Button
                variant="primary"
                isDisabled={!selectedProject || selecting || !hasUserSelectedProject}
                isLoading={selecting}
                onClick={onSubmit}
                data-testid="modal-submit-button"
              >
                Select
              </Button>
              {onCreateProject && status === WorkingProjectStatusValue.Listed && (
                <Button
                  variant="secondary"
                  isDisabled={selecting}
                  onClick={() => {
                    onClose();
                    onCreateProject();
                  }}
                >
                  Create project
                </Button>
              )}
              <Button
                variant="link"
                isDisabled={selecting}
                onClick={onClose}
                data-testid="modal-cancel-button"
              >
                Cancel
              </Button>
            </Flex>
          ) : (
            <Button variant="link" onClick={onClose}>
              Close
            </Button>
          )}
        </FlexItem>
      </Flex>
    </ModalFooter>
  );
};

export default WorkingProjectSelectorFooter;
