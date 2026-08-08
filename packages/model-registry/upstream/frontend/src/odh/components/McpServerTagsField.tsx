import React from 'react';
import { Button, FormGroup, TextInput, Tooltip } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { FieldGroupHelpLabelIcon, SortableData, Table } from 'mod-arch-shared';
import type { MCPTagEntry } from '~/odh/types/mcpRegistryTypes';

const TAGS_HELP =
  'Optional key-value metadata for this server, such as team or environment ownership.';

const TAG_COLUMNS: SortableData<MCPTagEntry>[] = [
  { field: 'tagKeyNoSort', label: 'Key', sortable: false, width: 45, className: 'pf-v6-u-pl-0' },
  { field: 'value', label: 'Value', sortable: false, width: 45 },
  { field: 'actions', label: '', sortable: false, className: 'pf-v6-u-pr-0' },
];

type McpServerTagsFieldProps = {
  tags: MCPTagEntry[];
  onChange: (tags: MCPTagEntry[]) => void;
};

type TagTableRowProps = {
  tag: MCPTagEntry;
  index: number;
  onChangeKey: (index: number, value: string) => void;
  onChangeValue: (index: number, value: string) => void;
  onRemove: (index: number) => void;
};

const TagTableRow: React.FC<TagTableRowProps> = ({
  tag,
  index,
  onChangeKey,
  onChangeValue,
  onRemove,
}) => (
  <Tr data-testid={`mcp-register-tag-row-${index}`}>
    <Td dataLabel="Key" className="pf-v6-u-pl-0">
      <TextInput
        aria-label={`Tag key ${index + 1}`}
        placeholder="Type a key"
        value={tag.key}
        onChange={(_event, value) => onChangeKey(index, value)}
        data-testid={`mcp-register-tag-key-${index}`}
      />
    </Td>
    <Td dataLabel="Value">
      <TextInput
        aria-label={`Tag value ${index + 1}`}
        placeholder="Type a value"
        value={tag.value}
        onChange={(_event, value) => onChangeValue(index, value)}
        data-testid={`mcp-register-tag-value-${index}`}
      />
    </Td>
    <Td isActionCell className="pf-v6-u-pr-0 pf-v6-u-text-align-end">
      <Tooltip content="Remove tag">
        <Button
          variant="plain"
          aria-label="Remove tag"
          icon={<MinusCircleIcon />}
          onClick={() => onRemove(index)}
          data-testid={`mcp-register-tag-remove-${index}`}
        />
      </Tooltip>
    </Td>
  </Tr>
);

const McpServerTagsField: React.FC<McpServerTagsFieldProps> = ({ tags, onChange }) => {
  const handleChangeKey = (index: number, value: string) => {
    onChange(tags.map((tag, i) => (i === index ? { ...tag, key: value } : tag)));
  };

  const handleChangeValue = (index: number, value: string) => {
    onChange(tags.map((tag, i) => (i === index ? { ...tag, value } : tag)));
  };

  const handleAdd = () => {
    onChange([...tags, { key: '', value: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <FormGroup
      label="Tags"
      fieldId="mcp-register-tags"
      labelHelp={<FieldGroupHelpLabelIcon content={TAGS_HELP} />}
    >
      <Table
        data-testid="mcp-register-tags-table"
        variant="compact"
        borders={false}
        gridBreakPoint=""
        columns={TAG_COLUMNS}
        data={tags}
        rowRenderer={(tag, index) => (
          <TagTableRow
            key={index}
            tag={tag}
            index={index}
            onChangeKey={handleChangeKey}
            onChangeValue={handleChangeValue}
            onRemove={handleRemove}
          />
        )}
      />
      <Button
        data-testid="mcp-register-tag-add"
        variant="link"
        icon={<PlusCircleIcon />}
        isInline
        onClick={handleAdd}
        className={tags.length > 0 ? 'pf-v6-u-mt-sm' : undefined}
      >
        Add tag
      </Button>
    </FormGroup>
  );
};

export default McpServerTagsField;
