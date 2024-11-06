import React, { useState } from 'react';
import { Label, LabelGroup, Alert, AlertVariant, Button } from '@patternfly/react-core';
import DashboardDescriptionListGroup from './DashboardDescriptionListGroup';

interface EditableLabelsProps {
  labels: string[];
  onLabelsChange: (labels: string[]) => Promise<void>;
  isArchive?: boolean;
  title?: string;
  contentWhenEmpty?: string;
  allExistingKeys: string[];
}

export const EditableLabelsDescriptionListGroup: React.FC<EditableLabelsProps> = ({
  title = 'Labels',
  contentWhenEmpty = 'No labels',
  labels,
  onLabelsChange,
  isArchive,
  allExistingKeys,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [unsavedLabels, setUnsavedLabels] = useState(labels);
  const [labelErrors, setLabelErrors] = useState<{ [key: string]: string }>({});

  const validateLabel = (text: string, currentLabel?: string): string | null => {
    if (currentLabel === text) {
      return null;
    }

    const isDuplicate =
      unsavedLabels.some((key) => key !== currentLabel && key === text) ||
      allExistingKeys.some((key) => key !== currentLabel && key === text);

    if (isDuplicate) {
      return `"${text}" already exists. Use a unique name that doesn't match any existing key or property`;
    }
    if (text.length > 63) {
      return "Label text can't exceed 63 characters";
    }
    return null;
  };

  const handleEditComplete = (
    _event: MouseEvent | KeyboardEvent,
    newText: string,
    currentLabel?: string,
  ) => {
    const error = validateLabel(newText, currentLabel);
    if (error) {
      setLabelErrors({ [newText]: error });
      setUnsavedLabels((prev) => {
        const filtered = prev.filter((label) => label !== currentLabel);
        return [...filtered, newText];
      });
    } else if (newText) {
      setUnsavedLabels((prev) => {
        if (currentLabel) {
          return [...prev, newText];
        }
        const filtered = prev.filter((label) => label !== currentLabel);
        return [...filtered, newText];
      });
      setLabelErrors({});
    }
  };

  const removeUnsavedLabel = (text: string) => {
    if (isSavingEdits) {
      return;
    }
    setUnsavedLabels(unsavedLabels.filter((label) => label !== text));
  };

  const addNewLabel = () => {
    if (isSavingEdits) {
      return;
    }
    const baseLabel = 'New Label';
    let counter = 1;
    let newLabel = baseLabel;

    while (unsavedLabels.includes(newLabel)) {
      newLabel = `${baseLabel} ${counter}`;
      counter++;
    }

    setUnsavedLabels((prev) => [...prev, newLabel]);
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
            {unsavedLabels.map((label, index, array) => (
              <Label
                data-testid={`editable-label-${label}`}
                key={label + index}
                color={labelErrors[label] && index === array.lastIndexOf(label) ? 'red' : 'blue'}
                isEditable={!isSavingEdits}
                onClose={() => removeUnsavedLabel(label)}
                closeBtnProps={{
                  isDisabled: isSavingEdits,
                  'data-testid': `remove-label-${label}`,
                }}
                onEditComplete={(event, newText) => handleEditComplete(event, newText, label)}
                editableProps={{
                  defaultValue: label,
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
