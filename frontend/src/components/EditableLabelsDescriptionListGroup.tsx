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
  const [addLabelInputValue, setAddLabelInputValue] = useState('');
  const [isAddLabelModalOpen, setIsAddLabelModalOpen] = useState(false);
  const [labelErrors, setLabelErrors] = useState<{ [key: string]: string }>({});

  const reservedKeys = [
    ...allExistingKeys.filter((key) => !labels.includes(key)),
    ...unsavedLabels,
  ];

  const validateLabel = (text: string): string | null => {
    console.log('Validating label:', text, 'Reserved keys:', reservedKeys);
    if (reservedKeys.includes(text)) {
      const error = `"${text}" already exists. Use a unique name that doesn't match any existing key or property`;
      console.log('Validation error:', error);
      return error;
    } else if (text.length > 63) {
      return "Label text can't exceed 63 characters";
    }
    return null;
  };

  const editUnsavedLabel = (newText: string, index: number) => {
    if (isSavingEdits) return;
    const copy = [...unsavedLabels];
    const oldText = copy[index];
    copy[index] = newText;
    setUnsavedLabels(copy);
    
    const error = validateLabel(newText);
    const newErrors = { ...labelErrors };
    delete newErrors[oldText];
    if (error) {
      newErrors[newText] = error;
    }
    setLabelErrors(newErrors);
  };

  const removeUnsavedLabel = (text: string) => {
    if (isSavingEdits) return;
    setUnsavedLabels(unsavedLabels.filter((label) => label !== text));
  };

  const addUnsavedLabel = (text: string) => {
    if (isSavingEdits) return;
    if (!text.trim()) return;
    
    const error = validateLabel(text.trim());
    if (error) {
      setLabelErrors(prev => ({ ...prev, [text.trim()]: error }));
      return;
    }
    
    setUnsavedLabels(prev => [...prev, text.trim()]);
    const newErrors = { ...labelErrors };
    delete newErrors[text.trim()];
    setLabelErrors(newErrors);
  };

  let addLabelValidationError: string | null = null;
  if (reservedKeys.includes(addLabelInputValue)) {
    addLabelValidationError = 'Label must not match an existing label or property key';
  } else if (addLabelInputValue.length > 63) {
    addLabelValidationError = "Label text can't exceed 63 characters";
  }

  const handleEditComplete = (_event: any, newText: string, index: number) => {
    console.log('Edit complete:', newText, 'Index:', index);
    const error = validateLabel(newText);
    if (error) {
      console.log('Setting error for:', newText, error);
      setLabelErrors(prev => ({ ...prev, [newText]: error }));
    } else {
      const newLabels = [...unsavedLabels];
      const oldLabel = newLabels[index];
      newLabels[index] = newText;
      setUnsavedLabels(newLabels);
      // Clear any previous errors for both old and new labels
      const newErrors = { ...labelErrors };
      delete newErrors[oldLabel];
      delete newErrors[newText];
      setLabelErrors(newErrors);
    }
  };

  return (
    <>
      <DashboardDescriptionListGroup
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
              data-testid="label-group"
              isEditable={!isSavingEdits}
              numLabels={10}
              expandedText="Show Less"
              collapsedText="Show More"
              addLabelControl={
                !isSavingEdits && (
                  <Label
                    color="blue"
                    variant="outline"
                    isEditable
                    editableProps={{
                      'aria-label': 'Add label'
                    }}
                    onEditComplete={(_event, newText) => {
                      console.log('Adding new label:', newText);
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
                  key={label}
                  color={labelErrors[label] ? 'red' : 'blue'}
                  isEditable={!isSavingEdits}
                  onClose={() => removeUnsavedLabel(label)}
                  closeBtnProps={{ isDisabled: isSavingEdits }}
                  onEditComplete={(_event, newText) => handleEditComplete(_event, newText, index)}
                >
                  {label}
                </Label>
              ))}
            </LabelGroup>
            {Object.keys(labelErrors).length > 0 && (
              <Alert
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
        <LabelGroup data-testid="label-group">
          {labels.map((label) => (
            <Label key={label} color="blue" data-testid="label">
              {label}
            </Label>
          ))}
        </LabelGroup>
      </DashboardDescriptionListGroup>
    </>
  );
};
