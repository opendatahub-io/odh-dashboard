import * as React from 'react';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import { Alert, Button, ModalFooter } from '@patternfly/react-core';
import DashboardModalFooter from '../DashboardModalFooter';
import {
  WorkingProjectStatusValue,
  type ProjectIdentity,
  type WorkingProjectStatus,
} from '../../context/WorkingProjectContext';

type Props = {
  isEmptyProjectList: boolean;
  showEmptyListClose: boolean;
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
  showEmptyListClose,
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
  if ((isEmptyProjectList && !showEmptyListClose) || showManualEmptyContent) {
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

  if (!canSelectProject || isEmptyProjectList) {
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
        <Button variant="link" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    );
  }

  const secondaryAction =
    onCreateProject && status === WorkingProjectStatusValue.Listed ? (
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
    ) : onAddProject &&
      status === WorkingProjectStatusValue.ListingUnavailable &&
      projects.length > 0 ? (
      <Button variant="secondary" isDisabled={selecting} onClick={onAddProject}>
        Add project
      </Button>
    ) : undefined;

  return (
    <ModalFooter>
      <DashboardModalFooter
        submitLabel="Select"
        isSubmitDisabled={!selectedProject || selecting || !hasUserSelectedProject}
        isSubmitLoading={selecting}
        isCancelDisabled={selecting}
        onSubmit={onSubmit}
        error={selectionError}
        alertTitle="Unable to change working project"
        secondaryActions={secondaryAction}
        onCancel={onClose}
      />
    </ModalFooter>
  );
};

export default WorkingProjectSelectorFooter;
