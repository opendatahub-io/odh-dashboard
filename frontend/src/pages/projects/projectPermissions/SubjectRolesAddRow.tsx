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

  const isExistingSubject = React.useMemo(() => {
    const normalized = subjectName.trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    return existingSubjectNames.some((n) => n.toLowerCase() === normalized);
  }, [existingSubjectNames, subjectName]);

  const hasAllRolesAssigned =
    subjectName.trim().length > 0 && availableRoles.every((r) => hasRoleRef(assignedRoles, r));

  const canPickRole = subjectName.trim().length > 0 && !hasAllRolesAssigned;
  const canSave = !!roleSelection && canPickRole;

  const handleSave = async () => {
    if (!roleSelection) {
      return;
    }
    setIsSaving(true);
    setSaveError(undefined);
    try {
      await onSave({ subjectName: subjectName.trim(), roleRef: roleSelection });
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
            groupLabel={`${
              subjectKind === 'user' ? 'Users' : 'Groups'
            } with existing project access`}
            placeholder={`Select a ${subjectKind} or type ${subjectKind} name`}
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
            createOptionMessage={(v) => `Grant access to "${v}"`}
          />
          <HelperText style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
            <HelperTextItem>
              Only {subjectKind}s with existing permissions are listed. To add someone new, enter
              their {subjectKind} name.
            </HelperTextItem>
          </HelperText>
        </Td>
        <Td dataLabel="Role">
          <RoleRefSelect
            availableRoles={availableRoles}
            assignedRoles={subjectName.trim().length > 0 ? assignedRoles : undefined}
            value={roleSelection}
            isDisabled={!canPickRole}
            disabledTooltip={
              hasAllRolesAssigned
                ? `The selected ${subjectKind} has already owned all available roles. Select another one and assign roles.`
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
                  ? `The selected ${subjectKind} has already owned all available roles. Select another one
                and assign roles.`
                  : `The selected ${subjectKind} already has existing roles. Any additions or changes will be merged with the existing roles.`}
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
