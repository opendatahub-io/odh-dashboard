import React, { useState } from 'react';
import {
  Label,
  LabelGroup,
  Alert,
  AlertVariant
} from '@patternfly/react-core';
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
      const error = `"${text}" already exists. Use a unique name that doesn't match any existing key or property`;
      return error;
    } else if (text.length > 63) {
      return "Label text can't exceed 63 characters";
    }
    return null;
  };

  const removeUnsavedLabel = (text: string) => {
    if (isSavingEdits) return;
    setUnsavedLabels(unsavedLabels.filter((label) => label !== text));
  };

  const handleEditComplete = (_event: any, newText: string, _index: number) => {
    const error = validateLabel(newText);
    if (error) {
      setLabelErrors(prev => ({ ...prev, [newText]: error }));
    } else {
      setUnsavedLabels(prev => [...prev, newText]);
      setLabelErrors({});
    }
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
            addLabelControl={
              !isSavingEdits && (
                <Label
                  data-testid="add-label-button"
                  color="blue"
                  variant="outline"
                  isEditable
                  editableProps={{
                    'aria-label': 'Add label',
                    defaultValue: '',
                    'data-testid': 'add-label-input'
                  }}
                  onEditComplete={(_event, newText) => {
                    const error = validateLabel(newText);
                    if (error) {
                      setLabelErrors(prev => ({ ...prev, [newText]: error }));
                    } else {
                      setUnsavedLabels(prev => [...prev, newText]);
                      const newErrors = { ...labelErrors };
                      delete newErrors[newText];
                      setLabelErrors(newErrors);
                    }
                  }}
                >
                  Add label
                </Label>
              )
            }
          >
            {unsavedLabels.map((label, index) => (
              <Label
                data-testid={`editable-label-${label}`}
                key={`${label}-${labelErrors[label] ? 'error' : 'normal'}`}
                color={labelErrors[label] ? 'red' : 'blue'}
                isEditable={!isSavingEdits}
                onClose={() => removeUnsavedLabel(label)}
                closeBtnProps={{ 
                  isDisabled: isSavingEdits,
                  'data-testid': `remove-label-${label}`
                }}
                onEditComplete={(_event, newText) => handleEditComplete(_event, newText, index)}
                editableProps={{
                  defaultValue: '',
                  'aria-label': 'Edit label',
                  'data-testid': `edit-label-input-${label}`
                }}
              >
                {label}
              </Label>
            ))}
          </LabelGroup>
          {Object.keys(labelErrors).length > 0 && (
            <Alert
              data-testid="label-error-alert"
              variant={AlertVariant.danger}
              isInline
              title={Object.values(labelErrors)[0]}
              aria-live="polite"
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
        if (Object.keys(labelErrors).length > 0) return;
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
