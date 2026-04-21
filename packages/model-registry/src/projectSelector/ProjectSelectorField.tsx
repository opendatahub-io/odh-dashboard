import React from 'react';
import {
  Alert,
  Button,
  FormGroup,
  HelperText,
  HelperTextItem,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
import { ProjectsContext } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
import FieldGroupHelpLabelIcon from '@odh-dashboard/internal/components/FieldGroupHelpLabelIcon';
import type { NamespaceSelectorFieldProps } from '@mf/modelRegistry/extension-points';

const SELECTOR_TOOLTIP =
  'This list includes only projects that you and the selected model registry have permission to access. To request access to a new or existing project, contact your administrator.';

const SELECTED_PROJECT_NO_ACCESS =
  'The selected project does not have access to this model registry. Contact your administrator to grant access.';

const WHO_IS_MY_ADMIN_POPOVER_CONTENT = (
  <Stack hasGutter>
    <StackItem>
      This list includes only projects that you have permission to access. To request access to a
      new or existing project, contact your administrator.
    </StackItem>
    <StackItem>
      <strong>Your administrator might be:</strong>
    </StackItem>
    <StackItem>
      <ul>
        <li>
          The person who assigned you your username, or who helped you log in for the first time
        </li>
        <li>Someone in your IT department or help desk</li>
        <li>A project manager or developer</li>
        <li>Your professor (at a school)</li>
      </ul>
    </StackItem>
  </Stack>
);

const ProjectSelectorField: React.FC<NamespaceSelectorFieldProps> = ({
  selectedNamespace,
  onSelect,
  hasAccess,
  isLoading,
  error,
  cannotCheck,
  registryName,
  selectorOnly,
}) => {
  const { projects, loaded: projectsLoaded } = React.useContext(ProjectsContext);
  const noProjects = projectsLoaded && projects.length === 0;

  const showNoAccessAlert = selectedNamespace && !isLoading && hasAccess === false;

  const labelHelp = <FieldGroupHelpLabelIcon content={SELECTOR_TOOLTIP} />;

  const helperTextNode = (
    <>
      {!projectsLoaded && (
        <HelperText>
          <HelperTextItem>Loading projects...</HelperTextItem>
        </HelperText>
      )}
      {selectedNamespace && isLoading && (
        <HelperText>
          <HelperTextItem>Checking access...</HelperTextItem>
        </HelperText>
      )}
      {noProjects && (
        <Alert
          isInline
          variant="warning"
          title="You do not have access to any projects. To request access to a new or existing project, contact your administrator."
          data-testid="namespace-registry-access-alert"
          className="pf-v6-u-mt-sm"
        >
          <Popover bodyContent={WHO_IS_MY_ADMIN_POPOVER_CONTENT} aria-label="Who is my admin?">
            <Button
              variant="link"
              isInline
              component="button"
              data-testid="who-is-my-admin-trigger"
              aria-label="Who is my admin?"
            >
              Who is my admin
            </Button>
          </Popover>
        </Alert>
      )}
      {showNoAccessAlert && (
        <Alert
          isInline
          variant="warning"
          title={SELECTED_PROJECT_NO_ACCESS}
          data-testid="namespace-registry-access-alert"
          className="pf-v6-u-mt-sm"
        >
          <Popover bodyContent={WHO_IS_MY_ADMIN_POPOVER_CONTENT} aria-label="Who is my admin?">
            <Button
              variant="link"
              isInline
              component="button"
              data-testid="who-is-my-admin-trigger"
              aria-label="Who is my admin?"
            >
              Who is my admin
            </Button>
          </Popover>
        </Alert>
      )}
      {selectedNamespace && !isLoading && cannotCheck && (
        <Alert
          isInline
          variant="info"
          title="Cannot check registry access with your permissions"
          data-testid="namespace-registry-cannot-check-alert"
          className="pf-v6-u-mt-sm"
        >
          Make sure this project has access to the {registryName} registry before proceeding, or the
          model storage job will fail.
        </Alert>
      )}
      {error && (
        <Alert
          isInline
          variant="danger"
          title="Could not verify project access"
          data-testid="namespace-registry-access-error"
          className="pf-v6-u-mt-sm"
        >
          {error.message}
        </Alert>
      )}
    </>
  );

  const selectorElement = (
    <ProjectSelector
      namespace={selectedNamespace}
      onSelection={onSelect}
      placeholder="Select a project"
      isFullWidth={!selectorOnly}
      isLoading={!projectsLoaded}
    />
  );

  if (selectorOnly) {
    return selectorElement;
  }

  return (
    <FormGroup
      label="Project"
      fieldId="project-select"
      isRequired
      labelHelp={labelHelp}
      data-testid="namespace-form-group"
    >
      {selectorElement}
      {helperTextNode}
    </FormGroup>
  );
};

export default ProjectSelectorField;
