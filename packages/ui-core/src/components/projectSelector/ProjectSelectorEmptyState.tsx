import * as React from 'react';
import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
} from '@patternfly/react-core';
import projectEmptyStateImage from '../../images/empty-state-projects-color.svg';

type Props = {
  content: React.ReactNode;
  showManualEmptyContent: boolean;
  manualProjectMode?: boolean;
  onAddProject?: () => void;
  onClose: () => void;
};

export const EmptyProjectIllustration: React.FC = () => (
  <img
    src={projectEmptyStateImage}
    alt=""
    className="odh-working-project-selector__empty-image"
    data-testid="working-project-empty-image"
  />
);

const ProjectSelectorEmptyState: React.FC<Props> = ({
  content,
  showManualEmptyContent,
  manualProjectMode,
  onAddProject,
  onClose,
}) => {
  if (!showManualEmptyContent) {
    return <>{content}</>;
  }

  return (
    <EmptyState
      headingLevel="h2"
      titleText="Start by adding a project"
      variant="lg"
      icon={manualProjectMode ? EmptyProjectIllustration : undefined}
    >
      <EmptyStateBody>
        Namespace listing is unavailable. Search for a project you have access to by its resource
        name. Projects you add remain visible in this browser until its data is cleared.
      </EmptyStateBody>
      <EmptyStateFooter>
        {onAddProject && (
          <EmptyStateActions>
            <Button variant="primary" onClick={onAddProject}>
              Add project
            </Button>
          </EmptyStateActions>
        )}
        {manualProjectMode && (
          <EmptyStateActions>
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
          </EmptyStateActions>
        )}
      </EmptyStateFooter>
    </EmptyState>
  );
};

export default ProjectSelectorEmptyState;
