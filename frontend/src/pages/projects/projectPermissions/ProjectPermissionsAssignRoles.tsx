import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Form,
  FormGroup,
  PageSectionVariants,
  Radio,
  PageSection,
  ActionList,
  ActionListItem,
  ActionListGroup,
  Bullseye,
  Spinner,
  FormHelperText,
  HelperText,
  HelperTextItem,
  FormSection,
  Content,
  ContentVariants,
  Alert,
} from '@patternfly/react-core';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  PermissionsContextProvider,
  usePermissionsContext,
} from '#~/concepts/permissions/PermissionsContext';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { useAccessReview } from '#~/api/useAccessReview.ts';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils.ts';
import SubjectNameTypeaheadSelect from './components/SubjectNameTypeaheadSelect';
import { useRoleAssignmentData } from './useRoleAssignmentData';

const ProjectPermissionsAssignRolesForm: React.FC = () => {
  const navigate = useNavigate();

  const { error } = usePermissionsContext();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { state }: { state?: { subjectKind?: 'user' | 'group'; subjectName?: string } } =
    useLocation();
  const isManageMode = !!state;

  const [subjectKind, setSubjectKind] = React.useState<'user' | 'group'>(
    state?.subjectKind ?? 'user',
  );
  const [subjectName, setSubjectName] = React.useState(state?.subjectName?.trim() ?? '');

  const { existingSubjectNames } = useRoleAssignmentData(subjectKind);

  return (
    <ApplicationsPage
      title={isManageMode ? 'Manage roles' : 'Assign roles'}
      description={
        isManageMode
          ? 'Manage roles to define permissions.'
          : 'Choose a user or group, then assign or manage roles to define their permissions.'
      }
      loaded
      loadError={error}
      empty={false}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => (
              <Link to="/projects" data-testid="assign-roles-breadcrumb-projects">
                Projects
              </Link>
            )}
          />
          <BreadcrumbItem
            render={() => (
              <Link
                to={`/projects/${currentProject.metadata.name}?section=permissions`}
                data-testid="assign-roles-breadcrumb-project"
              >
                {getDisplayNameFromK8sResource(currentProject)}
              </Link>
            )}
          />

          <BreadcrumbItem isActive>{isManageMode ? 'Manage roles' : 'Assign roles'}</BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <PageSection
        data-testid="project-permissions-assign-roles-page"
        variant={PageSectionVariants.default}
        isFilled
      >
        <Form
          data-testid="assign-roles-form"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <FormSection title="Subject">
            {!isManageMode && (
              <Content component={ContentVariants.p}>
                Select a subject with existing roles or enter a new subject.
              </Content>
            )}
            {!isManageMode && (
              <FormGroup label="Subject kind" isInline fieldId="subject-kind">
                <Radio
                  id="subject-kind-user"
                  name="subject-kind"
                  label="User"
                  isChecked={subjectKind === 'user'}
                  onChange={() => {
                    setSubjectKind('user');
                    setSubjectName('');
                  }}
                  data-testid="assign-roles-subject-kind-user"
                />
                <Radio
                  id="subject-kind-group"
                  name="subject-kind"
                  label="Group"
                  isChecked={subjectKind === 'group'}
                  onChange={() => {
                    setSubjectKind('group');
                    setSubjectName('');
                  }}
                  data-testid="assign-roles-subject-kind-group"
                />
              </FormGroup>
            )}
            <FormGroup
              label={subjectKind === 'user' ? 'User name' : 'Group name'}
              isRequired
              fieldId="subject-name"
            >
              {isManageMode ? (
                <Content component={ContentVariants.p} data-testid="assign-roles-subject-readonly">
                  {subjectName}
                </Content>
              ) : (
                <>
                  <SubjectNameTypeaheadSelect
                    groupLabel={`${
                      subjectKind === 'user' ? 'Users' : 'Groups'
                    } with existing assignment`}
                    placeholder={
                      subjectKind === 'user'
                        ? 'Select a user or type a username'
                        : 'Select a group or type a group name'
                    }
                    existingNames={existingSubjectNames}
                    value={subjectName}
                    onChange={setSubjectName}
                    onClear={() => setSubjectName('')}
                    dataTestId="assign-roles-subject-typeahead-toggle"
                    createOptionMessage={(v) => `Assign role to "${v}"`}
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        {subjectKind === 'user'
                          ? 'Only users that have already been assigned roles appear in the dropdown. To add a new user, type their username.'
                          : 'Only groups that have already been assigned roles appear in the dropdown. To add a new group, type its name.'}
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </>
              )}
            </FormGroup>
          </FormSection>
        </Form>
      </PageSection>
      <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
        <Alert
          isInline
          variant="info"
          title="Make sure to inform the specified user about the updated role assignments."
          data-testid="assign-roles-footer-alert"
        />
        <ActionList>
          <ActionListGroup>
            <ActionListItem>
              <Button
                variant="primary"
                data-testid="assign-roles-save"
                // TODO: implement the onSave handler in RHOAIENG-46634
                isDisabled
                onClick={() => {
                  // TODO: implement the onSave handler in RHOAIENG-46634
                }}
              >
                Save
              </Button>
            </ActionListItem>
            <ActionListItem>
              <Button
                variant="link"
                data-testid="assign-roles-cancel"
                onClick={() =>
                  navigate(`/projects/${currentProject.metadata.name}?section=permissions`)
                }
              >
                Cancel
              </Button>
            </ActionListItem>
          </ActionListGroup>
        </ActionList>
      </PageSection>
    </ApplicationsPage>
  );
};

const ProjectPermissionsAssignRoles: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const projectName = currentProject.metadata.name;
  const [allowAssignRoles, assignRolesLoaded] = useAccessReview({
    group: 'rbac.authorization.k8s.io',
    resource: 'rolebindings',
    namespace: projectName,
    verb: 'create',
  });

  if (!assignRolesLoaded) {
    return (
      <Bullseye style={{ minHeight: 150 }}>
        <Spinner />
      </Bullseye>
    );
  }

  // Prevent deep-link access for users who can't create role bindings.
  if (!allowAssignRoles) {
    return <Navigate to={`/projects/${projectName}?section=overview`} replace />;
  }

  return (
    <PermissionsContextProvider namespace={projectName}>
      <ProjectPermissionsAssignRolesForm />
    </PermissionsContextProvider>
  );
};

export default ProjectPermissionsAssignRoles;
