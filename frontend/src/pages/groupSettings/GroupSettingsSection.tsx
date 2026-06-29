import * as React from 'react';
import { CheckIcon, MinusCircleIcon, PlusCircleIcon, TimesIcon } from '@patternfly/react-icons';
import {
  Alert,
  AlertActionCloseButton,
  Button,
  Content,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Title,
  Timestamp,
  TimestampTooltipVariant,
  Tooltip,
} from '@patternfly/react-core';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import { SortableData, Table } from '@odh-dashboard/ui-core';
import { GroupKind } from '#~/k8sTypes';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { formatDateForLocalTooltip, relativeTime } from '#~/utilities/time';
import { ODH_PRODUCT_NAME } from '#~/utilities/const';
import RoleBindingPermissionsNameInput from '#~/concepts/roleBinding/RoleBindingPermissionsNameInput';
import { RoleBindingPermissionsRBType } from '#~/concepts/roleBinding/types';
import ContentModal from '#~/components/modals/ContentModal';

type GroupRow = {
  name: string;
  groupKind?: GroupKind;
};

const columns: SortableData<GroupRow>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 40,
    sortable: (a, b) => a.name.localeCompare(b.name),
  },
  {
    field: 'date',
    label: 'Date created',
    width: 30,
    info: {
      popover:
        'The date the group was created in OpenShift. This can differ from when the group was added to this list.',
      ariaLabel: 'Date created help',
    },
    sortable: (a, b) =>
      new Date(b.groupKind?.metadata.creationTimestamp ?? 0).getTime() -
      new Date(a.groupKind?.metadata.creationTimestamp ?? 0).getTime(),
  },
];

type GroupSettingsSectionProps = {
  roleLabel: 'administrator' | 'user';
  enabledGroupNames: string[];
  availableGroups: GroupKind[];
  onAdd: (name: string) => Promise<void>;
  onRemove: (name: string) => Promise<void>;
  isLoading: boolean;
  testId?: string;
};

const GroupSettingsSection: React.FC<GroupSettingsSectionProps> = ({
  roleLabel,
  enabledGroupNames,
  availableGroups,
  onAdd,
  onRemove,
  isLoading,
  testId,
}) => {
  const title = `${ODH_PRODUCT_NAME} ${roleLabel} groups`;
  const description = `These groups contain all ${ODH_PRODUCT_NAME} ${roleLabel}s.`;
  const infoMessage =
    roleLabel === 'administrator'
      ? `All cluster admins are automatically assigned as ${ODH_PRODUCT_NAME} administrators.`
      : undefined;
  const [isAdding, setIsAdding] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [groupToRemove, setGroupToRemove] = React.useState<string | undefined>();
  const [isRemoving, setIsRemoving] = React.useState(false);
  const [removeError, setRemoveError] = React.useState<Error | undefined>();
  const [error, setError] = React.useState<string | undefined>();

  const rows: GroupRow[] = enabledGroupNames.map((name) => ({
    name,
    groupKind: availableGroups.find((g) => g.metadata.name === name),
  }));

  const typeAheadOptions = availableGroups
    .map((g) => g.metadata.name)
    .filter((name) => !enabledGroupNames.includes(name));

  const isDuplicate = enabledGroupNames.includes(newGroupName);

  const handleAdd = async () => {
    if (!newGroupName || isDuplicate) {
      return;
    }
    setError(undefined);
    setIsSaving(true);
    try {
      await onAdd(newGroupName);
      setIsAdding(false);
      setNewGroupName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setNewGroupName('');
  };

  const isLastGroup = enabledGroupNames.length <= 1;

  return (
    <Stack hasGutter data-testid={testId}>
      <StackItem>
        <Flex
          direction={{ default: 'row' }}
          gap={{ default: 'gapSm' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <HeaderIcon type={ProjectObjectType.group} />
          <FlexItem>
            <Title headingLevel="h2" size="xl">
              {title}
            </Title>
          </FlexItem>
        </Flex>
      </StackItem>
      <StackItem>
        <Content component="p">{description}</Content>
      </StackItem>
      {infoMessage && (
        <StackItem>
          <Alert
            data-testid="data-science-administrator-info"
            variant="info"
            isInline
            isPlain
            title={infoMessage}
          />
        </StackItem>
      )}
      <StackItem>
        <Table
          variant="compact"
          data={rows}
          columns={columns}
          data-testid={`group-settings-table ${title}`}
          disableRowRenderSupport
          footerRow={() =>
            isAdding ? (
              <Tbody>
                <Tr>
                  <Td dataLabel="Name">
                    <>
                      <RoleBindingPermissionsNameInput
                        subjectKind={RoleBindingPermissionsRBType.GROUP}
                        value={newGroupName}
                        onChange={(val) => setNewGroupName(val)}
                        onClear={() => setNewGroupName('')}
                        placeholderText={`Select or type ${roleLabel} group name`}
                        typeAhead={typeAheadOptions}
                      />
                      {isDuplicate && (
                        <HelperText isLiveRegion className="pf-v6-u-mt-sm">
                          <HelperTextItem data-testid="duplicate-group-error" variant="error">
                            This group has already been added.
                          </HelperTextItem>
                        </HelperText>
                      )}
                    </>
                  </Td>
                  <Td dataLabel="Date created" />
                  <Td isActionCell modifier="nowrap" className="pf-v6-u-text-align-right">
                    <Split>
                      <SplitItem>
                        <Button
                          data-testid="save-new-group-button"
                          aria-label="Save group"
                          variant="link"
                          icon={<CheckIcon />}
                          isDisabled={isSaving || isRemoving || !newGroupName || isDuplicate}
                          onClick={handleAdd}
                        />
                      </SplitItem>
                      <SplitItem>
                        <Button
                          aria-label="Cancel add group"
                          variant="plain"
                          icon={<TimesIcon />}
                          isDisabled={isSaving}
                          onClick={handleCancel}
                        />
                      </SplitItem>
                    </Split>
                  </Td>
                </Tr>
              </Tbody>
            ) : null
          }
          rowRenderer={(row) => {
            const createdDate = row.groupKind?.metadata.creationTimestamp
              ? new Date(row.groupKind.metadata.creationTimestamp)
              : undefined;
            return (
              <Tbody key={row.name}>
                <Tr>
                  <Td dataLabel="Name">
                    <Content component="p">{row.name}</Content>
                  </Td>
                  <Td dataLabel="Date created">
                    {createdDate ? (
                      <Content component="p">
                        <Timestamp
                          date={createdDate}
                          tooltip={{
                            variant: TimestampTooltipVariant.custom,
                            content: formatDateForLocalTooltip(createdDate),
                          }}
                        >
                          {relativeTime(Date.now(), createdDate.getTime())}
                        </Timestamp>
                      </Content>
                    ) : (
                      '-'
                    )}
                  </Td>
                  <Td isActionCell modifier="nowrap" className="pf-v6-u-text-align-right">
                    {isLastGroup ? (
                      <Tooltip content="At least one group must be selected.">
                        <Button
                          data-testid={`remove-group-button ${row.name}`}
                          aria-label={`Remove ${row.name}`}
                          variant="plain"
                          icon={<MinusCircleIcon />}
                          isAriaDisabled
                        />
                      </Tooltip>
                    ) : (
                      <Button
                        data-testid={`remove-group-button ${row.name}`}
                        aria-label={`Remove ${row.name}`}
                        variant="plain"
                        icon={<MinusCircleIcon />}
                        isDisabled={isSaving || isRemoving}
                        onClick={() => setGroupToRemove(row.name)}
                      />
                    )}
                  </Td>
                </Tr>
              </Tbody>
            );
          }}
        />
      </StackItem>
      {error && (
        <StackItem>
          <Alert
            isInline
            variant="danger"
            title="Error"
            actionClose={<AlertActionCloseButton onClose={() => setError(undefined)} />}
          >
            {error}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <Button
          data-testid="add-group-button"
          variant="link"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          isDisabled={isLoading || isAdding || isRemoving}
          onClick={() => setIsAdding(true)}
          className="pf-v6-u-pl-lg"
        >
          {`Add ${roleLabel} group`}
        </Button>
      </StackItem>
      {groupToRemove && (
        <ContentModal
          title={`Remove ${ODH_PRODUCT_NAME} ${roleLabel} group?`}
          titleIconVariant="warning"
          variant="small"
          dataTestId="remove-group-modal"
          onClose={() => {
            setGroupToRemove(undefined);
            setRemoveError(undefined);
          }}
          contents={
            <>
              The <strong>{groupToRemove}</strong> group will be removed from the {roleLabel} group
              list. Members of this group will lose {roleLabel} access to {ODH_PRODUCT_NAME}.
            </>
          }
          error={removeError}
          alertTitle={`Error removing ${groupToRemove}`}
          buttonActions={[
            {
              label: 'Remove',
              variant: 'primary',
              dataTestId: 'modal-remove-button',
              isLoading: isRemoving,
              isDisabled: isRemoving,
              onClick: () => {
                setRemoveError(undefined);
                setIsRemoving(true);
                onRemove(groupToRemove)
                  .then(() => {
                    setGroupToRemove(undefined);
                  })
                  .catch((e) => {
                    setRemoveError(e instanceof Error ? e : new Error(String(e)));
                  })
                  .finally(() => setIsRemoving(false));
              },
            },
            {
              label: 'Cancel',
              variant: 'link',
              isDisabled: isRemoving,
              onClick: () => {
                setGroupToRemove(undefined);
                setRemoveError(undefined);
              },
            },
          ]}
        />
      )}
    </Stack>
  );
};

export default GroupSettingsSection;
