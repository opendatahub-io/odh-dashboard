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
import NavigationBlockerModal from '#~/components/NavigationBlockerModal';
import AssignRolesFooterActions from './manageRoles/AssignRolesFooterActions';
import AssignRolesSubjectSection from './manageRoles/AssignRolesSubjectSection';
import ManageRolesTable from './manageRoles/ManageRolesTable';
import RoleAssignmentChangesModal from './manageRoles/confirmModal/RoleAssignmentChangesModal';
import DiscardChangesModal from './manageRoles/confirmModal/DiscardChangesModal';
import useManageRolesData from './manageRoles/useManageRolesData';
import useDiscardChangesConfirmation from './manageRoles/useDiscardChangesConfirmation';
import { applyRoleAssignmentChanges } from './roleBindingMutations';
import type { SubjectKindSelection } from './types';

const ProjectPermissionsAssignRolesForm: React.FC = () => {
  const { error, roleBindings } = usePermissionsContext();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { state }: { state?: { subjectKind?: SubjectKindSelection; subjectName?: string } } =
    useLocation();
  const navigate = useNavigate();
  const isManageMode = !!state;
  const namespace = currentProject.metadata.name;

  const [subjectKind, setSubjectKind] = React.useState<SubjectKindSelection>(
    state?.subjectKind ?? 'user',
  );
  const [subjectName, setSubjectName] = React.useState(state?.subjectName?.trim() ?? '');
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  const {
    existingSubjectNames,
    rows,
    selections,
    toggleSelection,
    trimmedSubjectName,
    changes,
    hasChanges,
  } = useManageRolesData(subjectKind, subjectName);

  const { pendingChange, handleSubjectKindChange, handleSubjectNameChange, closeModal } =
    useDiscardChangesConfirmation(
      hasChanges,
      trimmedSubjectName,
      subjectKind,
      existingSubjectNames,
      setSubjectKind,
      setSubjectName,
    );

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
      const errorMessages = result.errors.map((e) => e.message).join('; ');
      throw new Error(
        `${result.failedCount} of ${result.totalOperations} operations failed: ${errorMessages}`,
      );
    }

    await roleBindings.refresh();
    setIsConfirmOpen(false);
    navigate(`/projects/${namespace}?section=permissions`);
  }, [subjectKind, trimmedSubjectName, changes, roleBindings, namespace, navigate]);

  return (
    <ApplicationsPage
      title="Manage permissions"
      description={
        isManageMode ? (
          <>
            Edit the role assignments of the {subjectKind} <strong>{subjectName}</strong>.
          </>
        ) : (
          'Select a user or group to edit their role assignments.'
        )
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

          <BreadcrumbItem isActive>Manage permissions</BreadcrumbItem>
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
            onSubjectKindChange={handleSubjectKindChange}
            onSubjectNameChange={handleSubjectNameChange}
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
      {pendingChange && (
        <DiscardChangesModal
          changeType={pendingChange.type}
          onDiscard={() => closeModal(true)}
          onCancel={() => closeModal(false)}
        />
      )}
      <NavigationBlockerModal hasUnsavedChanges={hasChanges} />
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
