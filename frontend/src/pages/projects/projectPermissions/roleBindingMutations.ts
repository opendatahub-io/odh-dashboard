import type { RoleBindingKind, RoleBindingSubject } from '#~/k8sTypes';
import {
  createRoleBinding,
  deleteRoleBinding,
  generateRoleBindingPermissions,
  patchRoleBindingSubjects,
} from '#~/api';
import { KnownLabels } from '#~/k8sTypes';
import type { RoleRef, SupportedSubjectKind } from '#~/concepts/permissions/types';
import { roleBindingHasSubject } from '#~/concepts/permissions/utils.ts';
import { allSettledPromises } from '#~/utilities/allSettledPromises';
import type { RoleAssignmentChanges } from './manageRoles/types';

export const buildRoleBindingSubject = (
  subjectKind: SupportedSubjectKind,
  subjectName: string,
): RoleBindingSubject => ({
  kind: subjectKind,
  apiGroup: 'rbac.authorization.k8s.io',
  name: subjectName,
});

const matchesRoleRefInNamespace = (
  rb: RoleBindingKind,
  namespace: string,
  roleRef: RoleRef,
): boolean =>
  rb.metadata.namespace === namespace &&
  rb.roleRef.kind === roleRef.kind &&
  rb.roleRef.name === roleRef.name;

// Returns the first RoleBinding that matches the given namespace + roleRef.
// Note: multiple RoleBindings can point to the same roleRef; callers should be explicit about how
// they choose which RoleBinding to patch.
export const findRoleBindingForRoleRef = ({
  roleBindings,
  namespace,
  roleRef,
}: {
  roleBindings: RoleBindingKind[];
  namespace: string;
  roleRef: RoleRef;
}): RoleBindingKind | undefined =>
  roleBindings.find((rb) => matchesRoleRefInNamespace(rb, namespace, roleRef));

// Returns ALL RoleBindings that match the given namespace + roleRef and contain the subject.
// Used for complete role removal when multiple RoleBindings grant the same role.
export const findAllRoleBindingsForSubjectAndRoleRef = ({
  roleBindings,
  namespace,
  roleRef,
  subject,
}: {
  roleBindings: RoleBindingKind[];
  namespace: string;
  roleRef: RoleRef;
  subject: RoleBindingSubject;
}): RoleBindingKind[] =>
  roleBindings.filter(
    (rb) => matchesRoleRefInNamespace(rb, namespace, roleRef) && roleBindingHasSubject(rb, subject),
  );

// Ensures the subject is assigned to the desired RoleRef by patching an existing RoleBinding (if any)
// or creating a new RoleBinding when none exists.
export const upsertRoleBinding = async ({
  roleBindings,
  namespace,
  subjectKind,
  subject,
  roleRef,
}: {
  roleBindings: RoleBindingKind[];
  namespace: string;
  subjectKind: SupportedSubjectKind;
  subject: RoleBindingSubject;
  roleRef: RoleRef;
}): Promise<void> => {
  const matches = roleBindings.filter((rb) => matchesRoleRefInNamespace(rb, namespace, roleRef));

  // If the subject is already assigned via ANY RoleBinding for this roleRef, don't patch/create.
  if (matches.some((rb) => roleBindingHasSubject(rb, subject))) {
    return;
  }

  // Otherwise patch the first matching RoleBinding (if any) or create a new one.
  const existing = matches.length > 0 ? matches[0] : undefined;
  if (!existing) {
    const rb = generateRoleBindingPermissions(
      namespace,
      subjectKind,
      subject.name,
      roleRef.name,
      roleRef.kind,
      { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
    );
    await createRoleBinding(rb);
    return;
  }

  const subjects = existing.subjects ?? [];
  await patchRoleBindingSubjects(existing.metadata.name, namespace, [...subjects, subject]);
};

// Removes the subject from the given RoleBinding.
// If the RoleBinding would become empty, delete it instead.
export const removeSubjectFromRoleBinding = async ({
  namespace,
  roleBinding,
  subject,
}: {
  namespace: string;
  roleBinding: RoleBindingKind;
  subject: RoleBindingSubject;
}): Promise<void> => {
  // Safety guard: don't mutate (or delete) a RoleBinding if it doesn't actually contain the subject.
  if (!roleBindingHasSubject(roleBinding, subject)) {
    return;
  }

  const subjects = roleBinding.subjects ?? [];
  const remainingSubjects = subjects.filter(
    (s) => !(s.kind === subject.kind && s.name === subject.name),
  );

  if (remainingSubjects.length === 0) {
    await deleteRoleBinding(roleBinding.metadata.name, namespace);
    return;
  }

  await patchRoleBindingSubjects(roleBinding.metadata.name, namespace, remainingSubjects);
};

export type ApplyRoleAssignmentResult = {
  success: boolean;
  totalOperations: number;
  successCount: number;
  failedCount: number;
  errors: Error[];
};

/**
 * Applies role assignment changes (assigning/unassigning) for a subject.
 * - For assigning: creates or patches RoleBindings to add the subject.
 * - For unassigning: removes the subject from RoleBindings (or deletes if empty).
 *
 * Uses allSettledPromises to attempt all operations and report results.
 * @returns A result object with success status and error details.
 */
export const applyRoleAssignmentChanges = async ({
  roleBindings,
  namespace,
  subjectKind,
  subjectName,
  changes,
}: {
  roleBindings: RoleBindingKind[];
  namespace: string;
  subjectKind: SupportedSubjectKind;
  subjectName: string;
  changes: RoleAssignmentChanges;
}): Promise<ApplyRoleAssignmentResult> => {
  const subject = buildRoleBindingSubject(subjectKind, subjectName);

  // Process all assignments
  const assignPromises = changes.assigning.map((row) =>
    upsertRoleBinding({
      roleBindings,
      namespace,
      subjectKind,
      subject,
      roleRef: row.roleRef,
    }),
  );

  // Process all unassignments - remove from ALL matching RoleBindings to ensure
  // the role is completely removed even if duplicate RoleBindings exist
  const unassignPromises = changes.unassigning.flatMap((row) => {
    const matchingRoleBindings = findAllRoleBindingsForSubjectAndRoleRef({
      roleBindings,
      namespace,
      roleRef: row.roleRef,
      subject,
    });
    if (matchingRoleBindings.length === 0) {
      // No RoleBinding found for this roleRef - nothing to remove
      return [];
    }
    return matchingRoleBindings.map((roleBinding) =>
      removeSubjectFromRoleBinding({
        namespace,
        roleBinding,
        subject,
      }),
    );
  });

  // Execute all mutations in parallel, waiting for all to complete
  const allPromises = [...assignPromises, ...unassignPromises];
  const [successes, fails] = await allSettledPromises<void, Error>(allPromises);

  const errors = fails.map((f) =>
    f.reason instanceof Error ? f.reason : new Error(String(f.reason)),
  );

  return {
    success: fails.length === 0,
    totalOperations: allPromises.length,
    successCount: successes.length,
    failedCount: fails.length,
    errors,
  };
};
