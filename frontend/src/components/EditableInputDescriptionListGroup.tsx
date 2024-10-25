import * as React from 'react';
import { ExpandableSection, TextInput } from '@patternfly/react-core';
import DashboardDescriptionListGroup, {
  DashboardDescriptionListGroupProps,
} from './DashboardDescriptionListGroup';

// A textInput Editable component that can be used in a description list group
type EditableInputDescriptionListGroupProps = Pick<
  DashboardDescriptionListGroupProps,
  'title' | 'contentWhenEmpty'
> & {
  value: string;
  saveEditedValue: (value: string) => Promise<void>;
  testid?: string;
  isArchive?: boolean;
};

const EditableInputDescriptionListGroup: React.FC<EditableInputDescriptionListGroupProps> = ({
  title,
  contentWhenEmpty,
  value,
  isArchive,
  saveEditedValue,
  testid,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [unsavedValue, setUnsavedValue] = React.useState(value);
  const [isSavingEdits, setIsSavingEdits] = React.useState(false);
  const [isTextExpanded, setIsTextExpanded] = React.useState(false);

  const safeTitle = typeof title === 'string' ? title : '';
  const baseTestId = testid || safeTitle.toLowerCase().replace(/\s+/g, '-');

  return (
    <DashboardDescriptionListGroup
      title={safeTitle}
      isEmpty={!value}
      contentWhenEmpty={contentWhenEmpty}
      isEditable={!isArchive}
      isEditing={isEditing}
      isSavingEdits={isSavingEdits}
      data-testid={`${baseTestId}-group`}
      contentWhenEditing={
        <TextInput
          autoFocus
          data-testid={`${baseTestId}-input`}
          aria-label={`Text input for editing ${safeTitle}`}
          value={unsavedValue}
          onChange={(_event, v) => setUnsavedValue(v)}
          isDisabled={isSavingEdits}
        />
      }
      onEditClick={() => {
        setUnsavedValue(value);
        setIsEditing(true);
      }}
      onSaveEditsClick={async () => {
        setIsSavingEdits(true);
        try {
          await saveEditedValue(unsavedValue);
        } finally {
          setIsSavingEdits(false);
        }
        setIsEditing(false);
      }}
      onDiscardEditsClick={() => {
        setUnsavedValue(value);
        setIsEditing(false);
      }}
    >
      <ExpandableSection
        data-testid={`${baseTestId}-expandable`}
        variant="truncate"
        truncateMaxLines={12}
        toggleText={isTextExpanded ? 'Show less' : 'Show more'}
        onToggle={(_event, isExpanded) => setIsTextExpanded(isExpanded)}
        isExpanded={isTextExpanded}
      >
        <span data-testid={`${baseTestId}-value`}>{value}</span>
      </ExpandableSection>
    </DashboardDescriptionListGroup>
  );
};

export default EditableInputDescriptionListGroup;
