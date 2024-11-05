import React, { useState } from 'react';
import { Label, LabelGroup, Alert, AlertVariant, Button } from '@patternfly/react-core';
import DashboardDescriptionListGroup from './DashboardDescriptionListGroup';

interface EditableLabelsProps {
  labels: string[];
  onLabelsChange: (labels: string[]) => Promise<void>;
  isArchive?: boolean;
  allExistingKeys?: string[];
  title?: string;
  contentWhenEmpty?: string;
}

export const EditableLabelsDescriptionListGroup: React.FC<EditableLabelsProps> = ({
  title = 'Labels',
  contentWhenEmpty = 'No labels',
  labels,
  onLabelsChange,
  isArchive,
  allExistingKeys = labels,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [unsavedLabels, setUnsavedLabels] = useState(labels);
  const [labelErrors, setLabelErrors] = useState<{ [key: string]: string }>({});

  const reservedKeys = [
    ...allExistingKeys.filter((key) => !labels.includes(key)),
    ...unsavedLabels,
  ];

  const validateLabel = (text: string): string | null => {
    if (reservedKeys.includes(text)) {
      return `"${text}" already exists. Use a unique name that doesn't match any existing key or property`;
    }
    if (text.length > 63) {
      return "Label text can't exceed 63 characters";
    }
    return null;
  };

  const removeUnsavedLabel = (text: string) => {
    if (isSavingEdits) {
      return;
    }
    setUnsavedLabels(unsavedLabels.filter((label) => label !== text));
  };

  const handleEditComplete = (_event: MouseEvent | KeyboardEvent, newText: string) => {
    const error = validateLabel(newText);
    if (error) {
      setLabelErrors((prev) => ({ ...prev, [newText]: error }));
    } else if (newText) {
      setUnsavedLabels((prev) => {
        const filtered = prev.filter((label) => label !== 'New Label');
        return [...filtered, newText];
      });
      setLabelErrors({});
    }
  };

  const addNewLabel = () => {
    if (isSavingEdits) {
      return;
    }
    setUnsavedLabels((prev) => [...prev, 'New Label']);
  };

  return (
    <DashboardDescriptionListGroup
      data-testid="editable-labels-group"
      title={title}
      isEmpty={labels.length === 0}
      contentWhenEmpty={contentWhenEmpty}
      isEditable={!isArchive}
      isEditing={isEditing}
      isSavingEdits={isSavingEdits}
      isSaveDisabled={Object.keys(labelErrors).length > 0}
      contentWhenEditing={
        <>
          <LabelGroup
            data-testid="editable-label-group"
            isEditable={!isSavingEdits}
            numLabels={10}
            expandedText="Show Less"
            collapsedText="Show More"
          >
            {unsavedLabels.map((label) => (
              <Label
                data-testid={`editable-label-${label}`}
                key={`${label}-${labelErrors[label] ? 'error' : 'normal'}`}
                color={labelErrors[label] ? 'red' : 'blue'}
                isEditable={!isSavingEdits}
                onClose={() => removeUnsavedLabel(label)}
                closeBtnProps={{
                  isDisabled: isSavingEdits,
                  'data-testid': `remove-label-${label}`,
                }}
                onEditComplete={(_event, newText) => handleEditComplete(_event, newText)}
                editableProps={{
                  defaultValue: '',
                  'aria-label': 'Edit label',
                  'data-testid': `edit-label-input-${label}`,
                }}
              >
                {label}
              </Label>
            ))}
            <Button
              data-testid="add-label-button"
              variant="plain"
              className="pf-v5-c-label pf-m-outline"
              onClick={addNewLabel}
              isDisabled={isSavingEdits}
              style={{
                border: '2px solid #d2d2d2',
                color: '#0066CC',
                backgroundColor: 'transparent',
              }}
            >
              Add label
            </Button>
          </LabelGroup>
          {Object.keys(labelErrors).length > 0 && (
            <Alert
              data-testid="label-error-alert"
              variant={AlertVariant.danger}
              isInline
              title={Object.values(labelErrors)[0]}
              aria-live="polite"
              isPlain
            />
          )}
        </>
      }
      onEditClick={() => {
        setUnsavedLabels(labels);
        setLabelErrors({});
        setIsEditing(true);
      }}
      onSaveEditsClick={async () => {
        if (Object.keys(labelErrors).length > 0) {
          return;
        }
        setIsSavingEdits(true);
        try {
          await onLabelsChange(unsavedLabels);
        } finally {
          setIsSavingEdits(false);
          setIsEditing(false);
        }
      }}
      onDiscardEditsClick={() => {
        setUnsavedLabels(labels);
        setIsEditing(false);
      }}
    >
      <LabelGroup data-testid="display-label-group">
        {labels.map((label) => (
          <Label key={label} color="blue" data-testid="label">
            {label}
          </Label>
        ))}
      </LabelGroup>
    </DashboardDescriptionListGroup>
  );
};
