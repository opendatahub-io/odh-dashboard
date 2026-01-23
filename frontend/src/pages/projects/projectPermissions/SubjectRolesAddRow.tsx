import * as React from 'react';
import { Button, HelperText, HelperTextItem, Icon } from '@patternfly/react-core';
import {
  CheckIcon,
  ExclamationTriangleIcon,
  InfoCircleIcon,
  TimesIcon,
} from '@patternfly/react-icons';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import { RoleRef } from '#~/concepts/permissions/types';
import { hasRoleRef } from '#~/concepts/permissions/utils';
import SubjectNameTypeaheadSelect from './components/SubjectNameTypeaheadSelect';
import RoleRefSelect from './components/RoleRefSelect';

export type SubjectRolesAddRowProps = {
  subjectKind: 'user' | 'group';
  existingSubjectNames: string[];
  availableRoles: RoleRef[];
  assignedRolesBySubject: Map<string, RoleRef[]>;
  onCancel: () => void;
  onSave: (draft: { subjectName: string; roleRef: RoleRef }) => Promise<void>;
};

const SubjectRolesAddRow: React.FC<SubjectRolesAddRowProps> = ({
  subjectKind,
  existingSubjectNames,
  availableRoles,
  assignedRolesBySubject,
  onCancel,
  onSave,
}) => {
  const [subjectName, setSubjectName] = React.useState('');
  const [roleSelection, setRoleSelection] = React.useState<RoleRef>();
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string>();

  const assignedRoles = React.useMemo(
    () => (subjectName ? assignedRolesBySubject.get(subjectName) ?? [] : []),
    [assignedRolesBySubject, subjectName],
  );
  const trimmedSubjectName = subjectName.trim();

  const isExistingSubject = React.useMemo(() => {
    const normalized = trimmedSubjectName.toLowerCase();
    if (!normalized) {
      return false;
    }
    return existingSubjectNames.some((n) => n.toLowerCase() === normalized);
  }, [existingSubjectNames, trimmedSubjectName]);

  const hasAllRolesAssigned =
    trimmedSubjectName.length > 0 && availableRoles.every((r) => hasRoleRef(assignedRoles, r));

  const canPickRole = trimmedSubjectName.length > 0 && !hasAllRolesAssigned;
  const canSave = !!roleSelection && canPickRole;

  const handleSave = async () => {
    if (!roleSelection) {
      return;
    }
    setIsSaving(true);
    setSaveError(undefined);
    try {
      await onSave({ subjectName: trimmedSubjectName, roleRef: roleSelection });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Tbody data-testid={`permissions-add-${subjectKind}-row`}>
      <Tr>
        <Td dataLabel="Name">
          <SubjectNameTypeaheadSelect
            groupLabel={`${subjectKind === 'user' ? 'Users' : 'Groups'} with existing assignment`}
            placeholder={
              subjectKind === 'user'
                ? `Select a user or type a username`
                : `Select a group or type a group name`
            }
            existingNames={existingSubjectNames}
            value={subjectName}
            onChange={(next) => {
              setSubjectName(next);
              setRoleSelection(undefined);
            }}
            onClear={() => {
              setSubjectName('');
              setRoleSelection(undefined);
            }}
            dataTestId={`permissions-add-${subjectKind}-subject-typeahead-toggle`}
            createOptionMessage={(v) => `Assign role to "${v}"`}
          />
          <HelperText style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
            <HelperTextItem>
              {subjectKind === 'user'
                ? 'Only users that have already been assigned roles appear in the dropdown. To add a new user, type their username.'
                : 'Only groups that have already been assigned roles appear in the dropdown. To add a new group, type its name.'}
            </HelperTextItem>
          </HelperText>
        </Td>
        <Td dataLabel="Role">
          <RoleRefSelect
            subjectKind={subjectKind}
            availableRoles={availableRoles}
            assignedRoles={trimmedSubjectName.length > 0 ? assignedRoles : undefined}
            value={roleSelection}
            isDisabled={!canPickRole}
            disabledTooltip={
              !trimmedSubjectName
                ? `Select a ${subjectKind} to assign a role.`
                : hasAllRolesAssigned
                ? `All available roles are already assigned to the selected ${subjectKind}.`
                : undefined
            }
            onChange={setRoleSelection}
            dataTestId={`permissions-add-${subjectKind}-role-select-toggle`}
          />
          {isExistingSubject && assignedRoles.length > 0 ? (
            <HelperText style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
              <HelperTextItem
                icon={
                  hasAllRolesAssigned ? (
                    <Icon status="warning" isInline>
                      <ExclamationTriangleIcon />
                    </Icon>
                  ) : (
                    <Icon status="info" isInline>
                      <InfoCircleIcon />
                    </Icon>
                  )
                }
              >
                {hasAllRolesAssigned
                  ? `All available roles are already assigned to the selected ${subjectKind}.`
                  : `This ${subjectKind} already has roles. Any roles you add will be added to the existing set.`}
              </HelperTextItem>
            </HelperText>
          ) : null}
        </Td>
        <Td dataLabel="Date created">-</Td>
        <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
          <Button
            aria-label="Save new role assignment"
            variant="plain"
            icon={<CheckIcon />}
            isLoading={isSaving}
            isDisabled={!canSave || isSaving}
            onClick={handleSave}
            data-testid={`permissions-add-${subjectKind}-save`}
          />
          <Button
            aria-label="Cancel new role assignment"
            variant="plain"
            icon={<TimesIcon />}
            isDisabled={isSaving}
            onClick={onCancel}
            data-testid={`permissions-add-${subjectKind}-cancel`}
          />
          {saveError ? (
            <HelperText style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
              <HelperTextItem
                variant="error"
                data-testid={`permissions-add-${subjectKind}-save-error`}
              >
                {saveError}
              </HelperTextItem>
            </HelperText>
          ) : null}
        </Td>
      </Tr>
    </Tbody>
  );
};

export default SubjectRolesAddRow;
