import * as React from 'react';
import {
  Button,
  HelperText,
  HelperTextItem,
  Icon,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { CheckIcon, ExclamationTriangleIcon, TimesIcon } from '@patternfly/react-icons';
import { Td, Tr } from '@patternfly/react-table';
import { getRoleDisplayName } from '#~/concepts/permissions/utils';
import type { RoleRef } from '#~/concepts/permissions/types';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import type { SubjectRoleRow } from './types';
import { isReversibleRoleRef } from './utils';
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
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

  const hasChanged = !isSameRoleRef(roleSelection, row.roleRef);
  const isIrreversibleToReversible =
    hasChanged && !isReversibleRoleRef(row.roleRef) && isReversibleRoleRef(roleSelection);

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
    <>
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
          {isIrreversibleToReversible ? (
            <HelperText style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
              <HelperTextItem
                icon={
                  <Icon status="warning" isInline>
                    <ExclamationTriangleIcon />
                  </Icon>
                }
              >
                {`${getRoleDisplayName(
                  row.roleRef,
                  row.role,
                )} is an irreversible role. If you replace it, you won’t be able to add it back in ${ODH_PRODUCT_NAME}.`}
              </HelperTextItem>
            </HelperText>
          ) : null}
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
            onClick={() => (isIrreversibleToReversible ? setIsConfirmOpen(true) : handleSave())}
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
      {isConfirmOpen ? (
        <Modal
          isOpen
          variant={ModalVariant.small}
          onClose={() => setIsConfirmOpen(false)}
          data-testid={`permissions-edit-${subjectKind}-replace-role-modal`}
        >
          <ModalHeader title="Replace irreversible role?" titleIconVariant="warning" />
          <ModalBody>
            You are replacing an AI or OpenShift custom role with an OpenShift default role. Once
            saved, the current role will be removed and cannot be re-added from the{' '}
            {ODH_PRODUCT_NAME} UI. You’ll need to use OpenShift or the CLI to assign it again.
          </ModalBody>
          <ModalFooter>
            <Button
              variant="primary"
              isDisabled={isSaving}
              onClick={async () => {
                setIsConfirmOpen(false);
                await handleSave();
              }}
              data-testid={`permissions-edit-${subjectKind}-replace-role-confirm`}
            >
              Replace role
            </Button>
            <Button
              variant="link"
              isDisabled={isSaving}
              onClick={() => setIsConfirmOpen(false)}
              data-testid={`permissions-edit-${subjectKind}-replace-role-cancel`}
            >
              Cancel
            </Button>
          </ModalFooter>
        </Modal>
      ) : null}
    </>
  );
};

export default SubjectRolesEditRow;
