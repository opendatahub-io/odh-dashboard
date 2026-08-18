import React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { ExclamationCircleIcon, MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import FieldGroupHelpLabelIcon from '@odh-dashboard/ui-core/components/FieldGroupHelpLabelIcon';
import { Table, type SortableData } from '@odh-dashboard/ui-core';
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

const TagFieldError: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <StackItem>
    <FormHelperText>
      <HelperText>
        <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
          {children}
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  </StackItem>
);

const remapTouchedIndices = (prev: Set<number>, removedIndex: number): Set<number> => {
  const next = new Set<number>();
  prev.forEach((i) => {
    if (i < removedIndex) {
      next.add(i);
    } else if (i > removedIndex) {
      next.add(i - 1);
    }
  });
  return next;
};

type TagTableRowProps = {
  tag: MCPTagEntry;
  index: number;
  keyTouched: boolean;
  valueTouched: boolean;
  onChangeKey: (index: number, value: string) => void;
  onChangeValue: (index: number, value: string) => void;
  onBlurKey: (index: number) => void;
  onBlurValue: (index: number) => void;
  onRemove: (index: number) => void;
};

const TagTableRow: React.FC<TagTableRowProps> = ({
  tag,
  index,
  keyTouched,
  valueTouched,
  onChangeKey,
  onChangeValue,
  onBlurKey,
  onBlurValue,
  onRemove,
}) => {
  const hasKey = Boolean(tag.key.trim());
  const hasValue = Boolean(tag.value.trim());
  const showKeyError = keyTouched && !hasKey && hasValue;
  const showValueError = valueTouched && hasKey && !hasValue;

  return (
    <Tr data-testid={`mcp-register-tag-row-${index}`}>
      <Td dataLabel="Key" className="pf-v6-u-pl-0">
        <Stack>
          <StackItem>
            <TextInput
              aria-label={`Tag key ${index + 1}`}
              placeholder="Type a key"
              value={tag.key}
              validated={showKeyError ? 'error' : 'default'}
              onChange={(_event, value) => onChangeKey(index, value)}
              onBlur={() => onBlurKey(index)}
              data-testid={`mcp-register-tag-key-${index}`}
            />
          </StackItem>
          {showKeyError ? <TagFieldError>Enter a key</TagFieldError> : null}
        </Stack>
      </Td>
      <Td dataLabel="Value">
        <Stack>
          <StackItem>
            <TextInput
              aria-label={`Tag value ${index + 1}`}
              placeholder="Type a value"
              value={tag.value}
              validated={showValueError ? 'error' : 'default'}
              onChange={(_event, value) => onChangeValue(index, value)}
              onBlur={() => onBlurValue(index)}
              data-testid={`mcp-register-tag-value-${index}`}
            />
          </StackItem>
          {showValueError ? <TagFieldError>Enter a value</TagFieldError> : null}
        </Stack>
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
};

const McpServerTagsField: React.FC<McpServerTagsFieldProps> = ({ tags, onChange }) => {
  const [touchedKeys, setTouchedKeys] = React.useState<Set<number>>(new Set());
  const [touchedValues, setTouchedValues] = React.useState<Set<number>>(new Set());

  const handleChangeKey = (index: number, value: string) => {
    setTouchedKeys((prev) => {
      if (!prev.has(index)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    onChange(tags.map((tag, i) => (i === index ? { ...tag, key: value } : tag)));
  };

  const handleChangeValue = (index: number, value: string) => {
    setTouchedValues((prev) => {
      if (!prev.has(index)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
    onChange(tags.map((tag, i) => (i === index ? { ...tag, value } : tag)));
  };

  const handleBlurKey = (index: number) => {
    const tag = tags.at(index);
    if (!tag) {
      return;
    }
    setTouchedKeys((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
    if (tag.key.trim() && !tag.value.trim()) {
      setTouchedValues((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
    }
  };

  const handleBlurValue = (index: number) => {
    const tag = tags.at(index);
    if (!tag) {
      return;
    }
    setTouchedValues((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
    if (tag.value.trim() && !tag.key.trim()) {
      setTouchedKeys((prev) => (prev.has(index) ? prev : new Set(prev).add(index)));
    }
  };

  const handleAdd = () => {
    onChange([...tags, { key: '', value: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
    setTouchedKeys((prev) => remapTouchedIndices(prev, index));
    setTouchedValues((prev) => remapTouchedIndices(prev, index));
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
        isPlain
        gridBreakPoint=""
        columns={TAG_COLUMNS}
        data={tags}
        rowRenderer={(tag, index) => (
          <TagTableRow
            key={index}
            tag={tag}
            index={index}
            keyTouched={touchedKeys.has(index)}
            valueTouched={touchedValues.has(index)}
            onChangeKey={handleChangeKey}
            onChangeValue={handleChangeValue}
            onBlurKey={handleBlurKey}
            onBlurValue={handleBlurValue}
            onRemove={handleRemove}
          />
        )}
      />
      <Button
        data-testid="mcp-register-tag-add"
        variant="link"
        icon={<PlusCircleIcon />}
        onClick={handleAdd}
        className={tags.length > 0 ? 'pf-v6-u-mt-sm' : undefined}
      >
        Add tag
      </Button>
    </FormGroup>
  );
};

export default McpServerTagsField;
