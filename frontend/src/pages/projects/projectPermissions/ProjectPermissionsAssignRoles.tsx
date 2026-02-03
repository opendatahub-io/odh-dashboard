import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Form,
  PageSectionVariants,
  PageSection,
  Spinner,
  Bullseye,
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
import { RBAC_SUBJECT_KIND_USER, RBAC_SUBJECT_KIND_GROUP } from '#~/concepts/permissions/const';
import type { SupportedSubjectKind } from '#~/concepts/permissions/types';
import AssignRolesFooterActions from './manageRoles/AssignRolesFooterActions';
import AssignRolesSubjectSection from './manageRoles/AssignRolesSubjectSection';
import ManageRolesTable from './manageRoles/ManageRolesTable';
import RoleAssignmentChangesModal from './manageRoles/confirmModal/RoleAssignmentChangesModal';
import useManageRolesData from './manageRoles/useManageRolesData';
import { useRoleAssignmentData } from './useRoleAssignmentData';
import { applyRoleAssignmentChanges } from './roleBindingMutations';

const ProjectPermissionsAssignRolesForm: React.FC = () => {
  const { error, roleBindings } = usePermissionsContext();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { state }: { state?: { subjectKind?: 'user' | 'group'; subjectName?: string } } =
    useLocation();
  const navigate = useNavigate();
  const isManageMode = !!state;
  const namespace = currentProject.metadata.name;

  const [subjectKind, setSubjectKind] = React.useState<'user' | 'group'>(
    state?.subjectKind ?? 'user',
  );
  const [subjectName, setSubjectName] = React.useState(state?.subjectName?.trim() ?? '');
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  const { existingSubjectNames } = useRoleAssignmentData(subjectKind);
  const { rows, selections, toggleSelection, trimmedSubjectName, changes, hasChanges } =
    useManageRolesData(subjectKind, subjectName, existingSubjectNames);

  const handleSave = React.useCallback(async (): Promise<void> => {
    const rbacSubjectKind: SupportedSubjectKind =
      subjectKind === 'user' ? RBAC_SUBJECT_KIND_USER : RBAC_SUBJECT_KIND_GROUP;

    const result = await applyRoleAssignmentChanges({
      roleBindings: roleBindings.data,
      namespace,
      subjectKind: rbacSubjectKind,
      subjectName: trimmedSubjectName,
      changes,
    });

    if (!result.success) {
      // Build a descriptive error message
      const errorMessages = result.errors.map((e) => e.message).join('; ');
      throw new Error(
        `${result.failedCount} of ${result.totalOperations} operations failed: ${errorMessages}`,
      );
    }

    // Refresh roleBindings after successful save
    await roleBindings.refresh();

    // Navigate back to permissions tab
    navigate(`/projects/${namespace}?section=permissions`);
  }, [subjectKind, trimmedSubjectName, changes, roleBindings, namespace, navigate]);

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
          <AssignRolesSubjectSection
            isManageMode={isManageMode}
            subjectKind={subjectKind}
            subjectName={subjectName}
            existingSubjectNames={existingSubjectNames}
            onSubjectKindChange={(kind) => {
              setSubjectKind(kind);
              setSubjectName('');
            }}
            onSubjectNameChange={setSubjectName}
          />
          <ManageRolesTable
            subjectName={subjectName}
            rows={rows}
            selections={selections}
            onToggle={toggleSelection}
          />
        </Form>
      </PageSection>
      <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
        <AssignRolesFooterActions hasChanges={hasChanges} onSave={() => setIsConfirmOpen(true)} />
      </PageSection>
      {isConfirmOpen && (
        <RoleAssignmentChangesModal
          subjectName={trimmedSubjectName}
          changes={changes}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleSave}
        />
      )}
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
