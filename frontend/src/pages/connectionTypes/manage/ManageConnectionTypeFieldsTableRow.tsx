import * as React from 'react';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { ActionsColumn, TableText, Td, Tr } from '@patternfly/react-table';
import { Button, Flex, FlexItem, Icon, Label, Switch, Truncate } from '@patternfly/react-core';
import {
  ConnectionTypeField,
  ConnectionTypeFieldType,
  SectionField,
} from '#~/concepts/connectionTypes/types';
import {
  defaultValueToString,
  fieldTypeToString,
  findSectionFields,
} from '#~/concepts/connectionTypes/utils';
import type { RowProps } from '#~/utilities/useDraggableTableControlled';
import { columns } from '#~/pages/connectionTypes/manage/fieldTableColumns';
import ConnectionTypeDataFieldRemoveModal from '#~/pages/connectionTypes/manage/ConnectionTypeDataFieldRemoveModal';
import ConnectionTypeSectionRemoveModal from '#~/pages/connectionTypes/manage/ConnectionTypeSectionRemoveModal';
import { TableRowTitleDescription } from '#~/components/table';
import { ValidationContext } from '#~/utilities/useValidation';
import { ValidationErrorCodes } from '#~/concepts/connectionTypes/validationUtils';

type Props = {
  row: ConnectionTypeField;
  fields: ConnectionTypeField[];
  onEdit: () => void;
  onRemove: (removeSectionFields?: boolean) => void;
  onDuplicate: () => void;
  onAddField: (parentSection: SectionField) => void;
  onMoveToSection: () => void;
  onChange: (updatedField: ConnectionTypeField) => void;
} & RowProps;

const ManageConnectionTypeFieldsTableRow: React.FC<Props> = ({
  row,
  fields,
  onEdit,
  onRemove,
  onDuplicate,
  onAddField,
  onMoveToSection,
  onChange,
  ...props
}) => {
  const rowIndex = React.useMemo(() => fields.findIndex((f) => f === row), [fields, row]);
  const { hasValidationIssue } = React.useContext(ValidationContext);
  const showMoveToSection = React.useMemo(() => {
    const parentSection = fields.findLast(
      (f, i) => f.type === ConnectionTypeFieldType.Section && i < rowIndex,
    );
    const numSections = fields.filter((f) => f.type === ConnectionTypeFieldType.Section).length;
    const potentialSectionsToMoveTo = parentSection ? numSections - 1 : numSections;
    return potentialSectionsToMoveTo > 0;
  }, [fields, rowIndex]);
  const [showRemoveField, setShowRemoveField] = React.useState<boolean>();

  if (row.type === ConnectionTypeFieldType.Section) {
    return (
      <Tr draggable isStriped data-testid="row" {...props}>
        <Td
          draggableRow={{
            id: `draggable-row-${props.id}`,
          }}
        />
        <Td dataLabel={columns[0].label} data-testid="field-name">
          <TableRowTitleDescription
            title={
              <Flex gap={{ default: 'gapSm' }} flexWrap={{ default: 'nowrap' }}>
                <FlexItem>
                  <Truncate content={row.name} />
                </FlexItem>
                <FlexItem>
                  <Label color="blue" data-testid="section-heading">
                    Section heading
                  </Label>
                </FlexItem>
              </Flex>
            }
            description={row.description}
            truncateDescriptionLines={2}
          />
        </Td>
        <Td visibility={columns[1].visibility} />
        <Td visibility={columns[2].visibility} />
        <Td visibility={columns[3].visibility} />
        <Td visibility={columns[4].visibility} />
        <Td isActionCell modifier="nowrap">
          <Button variant="secondary" onClick={() => onAddField(row)}>
            Add field
          </Button>
          <ActionsColumn
            items={[
              {
                title: 'Edit',
                onClick: () => onEdit(),
              },
              {
                title: 'Duplicate',
                onClick: () => onDuplicate(),
              },
              { isSeparator: true },
              {
                title: 'Remove',
                onClick: () => setShowRemoveField(true),
              },
            ]}
          />
        </Td>
        {showRemoveField ? (
          <ConnectionTypeSectionRemoveModal
            field={row}
            fields={findSectionFields(rowIndex, fields)}
            onClose={(submit, removeFields) => {
              setShowRemoveField(false);
              if (submit) {
                onRemove(removeFields);
              }
            }}
          />
        ) : null}
      </Tr>
    );
  }

  return (
    <Tr draggable data-testid="row" {...props}>
      <Td
        draggableRow={{
          id: `draggable-row-${props.id}`,
        }}
      />
      <Td dataLabel={columns[0].label} data-testid="field-name" visibility={columns[0].visibility}>
        <TableRowTitleDescription
          title={<Truncate content={row.name} />}
          description={row.description}
          truncateDescriptionLines={2}
        />
      </Td>
      <Td dataLabel={columns[1].label} data-testid="field-env" visibility={columns[1].visibility}>
        <Flex gap={{ default: 'gapSm' }} flexWrap={{ default: 'nowrap' }}>
          <FlexItem>
            <Truncate content={row.envVar || '-'} />
          </FlexItem>
          {hasValidationIssue(
            ['fields', rowIndex, 'envVar'],
            ValidationErrorCodes.ENV_VAR_CONFLICT,
          ) ? (
            <FlexItem>
              <Icon
                status="danger"
                size="sm"
                aria-label="This environment variable is in conflict."
              >
                <ExclamationCircleIcon />
              </Icon>
            </FlexItem>
          ) : undefined}
        </Flex>
      </Td>
      <Td dataLabel={columns[2].label} data-testid="field-type" visibility={columns[2].visibility}>
        {fieldTypeToString(row.type)}
      </Td>
      <Td
        dataLabel={columns[3].label}
        data-testid="field-default"
        visibility={columns[3].visibility}
      >
        <TableText wrapModifier="truncate">{defaultValueToString(row) || '-'}</TableText>
      </Td>
      <Td dataLabel={columns[4].label} visibility={columns[4].visibility}>
        <Switch
          aria-label="toggle field required"
          isChecked={row.required || false}
          data-testid="field-required"
          onChange={() => onChange({ ...row, required: !row.required })}
        />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit',
              onClick: () => onEdit(),
            },
            {
              title: 'Duplicate',
              onClick: () => onDuplicate(),
            },
            ...(showMoveToSection
              ? [
                  {
                    title: 'Move to section heading',
                    onClick: () => onMoveToSection(),
                  },
                ]
              : []),
            { isSeparator: true },
            {
              title: 'Remove',
              onClick: () => setShowRemoveField(true),
            },
          ]}
        />
      </Td>
      {showRemoveField ? (
        <ConnectionTypeDataFieldRemoveModal
          field={row}
          onClose={(submit) => {
            setShowRemoveField(false);
            if (submit) {
              onRemove();
            }
          }}
        />
      ) : null}
    </Tr>
  );
};

export default ManageConnectionTypeFieldsTableRow;
