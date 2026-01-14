import * as React from 'react';
import { Button, HelperText, HelperTextItem } from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import type { RoleRef } from '#~/concepts/permissions/types';
import type { SubjectRoleRow } from './types';
import RoleRefSelect from './components/RoleRefSelect';

type SubjectRolesEditRowProps = {
  row: SubjectRoleRow;
  subjectKind: 'user' | 'group';
  subjectNameRowSpan: number;
  availableRoles: RoleRef[];
  assignedRoles: RoleRef[];
  onCancel: () => void;
  onSave: (nextRoleRef: RoleRef) => Promise<void>;
};

const isSameRoleRef = (a: RoleRef, b: RoleRef): boolean => a.kind === b.kind && a.name === b.name;

const SubjectRolesEditRow: React.FC<SubjectRolesEditRowProps> = ({
  row,
  subjectKind,
  subjectNameRowSpan,
  availableRoles,
  assignedRoles,
  onCancel,
  onSave,
}) => {
  const [roleSelection, setRoleSelection] = React.useState<RoleRef>(row.roleRef);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string>();

  const hasChanged = !isSameRoleRef(roleSelection, row.roleRef);

  const handleSave = async () => {
    if (!hasChanged) {
      return;
    }
    setIsSaving(true);
    setSaveError(undefined);
    try {
      await onSave(roleSelection);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Tr>
      {subjectNameRowSpan > 0 ? (
        <Td dataLabel="Name" rowSpan={subjectNameRowSpan}>
          {row.subjectName}
        </Td>
      ) : null}
      <Td
        dataLabel="Role"
        style={{
          paddingInlineStart: 'var(--pf-v6-c-table--cell--Padding--base)',
        }}
      >
        <RoleRefSelect
          subjectKind={subjectKind}
          availableRoles={availableRoles}
          assignedRoles={assignedRoles}
          value={roleSelection}
          isDisabled={false}
          onChange={(next) => next && setRoleSelection(next)}
          dataTestId={`permissions-edit-${subjectKind}-role-select-toggle`}
        />
        {saveError ? (
          <HelperText style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
            <HelperTextItem variant="error">{saveError}</HelperTextItem>
          </HelperText>
        ) : null}
      </Td>
      <Td dataLabel="Date created">-</Td>
      <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
        <Button
          aria-label="Save edited role assignment"
          variant="plain"
          icon={<CheckIcon />}
          isLoading={isSaving}
          isDisabled={!hasChanged || isSaving}
          onClick={handleSave}
          data-testid={`permissions-edit-${subjectKind}-save`}
        />
        <Button
          aria-label="Cancel edit role assignment"
          variant="plain"
          icon={<TimesIcon />}
          isDisabled={isSaving}
          onClick={() => !isSaving && onCancel()}
          data-testid={`permissions-edit-${subjectKind}-cancel`}
        />
      </Td>
    </Tr>
  );
};

export default SubjectRolesEditRow;
