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

  const validateLabels = (labels: string[]): string[] => {
    const errors: string[] = [];
    const duplicateLabels = new Set<string>();
    
    const seenLabels = new Set<string>();
    labels.forEach(label => {
      if (seenLabels.has(label)) {
        duplicateLabels.add(label);
      }
      seenLabels.add(label);
    });
    
    duplicateLabels.forEach(label => {
      errors.push(`"${label}" appears multiple times. Labels must be unique.`);
    });

    labels.forEach(label => {
      if (!labels.includes(label) && allExistingKeys.includes(label)) {
        errors.push(`"${label}" already exists. Use a unique name that doesn't match any existing key or property`);
      }
    });

    labels.forEach(label => {
      if (label.length > 63) {
        errors.push(`"${label}" exceeds 63 characters`);
      }
    });

    return errors;
  };

  const handleEditComplete = (
    _event: MouseEvent | KeyboardEvent,
    newText: string,
    currentLabel?: string,
  ) => {
    if (!newText) return;

    setUnsavedLabels(prev => {
      if (currentLabel) {
        const filtered = prev.filter(label => label !== currentLabel);
        return [...filtered, newText];
      } else {
        return [...prev, newText];
      }
    });
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

  const labelErrors = validateLabels(unsavedLabels);

  const shouldBeRed = (label: string, index: number): boolean => {
    const firstIndex = unsavedLabels.findIndex(l => l === label);
    
    if (firstIndex !== index) {
      return true;
    }

    return labelErrors.some(error => 
      error.includes(`"${label}"`) && !error.includes('appears multiple times')
    );
  };

  return (
    <DashboardDescriptionListGroup
      editButtonTestId="editable-labels-group-edit"
      saveButtonTestId="editable-labels-group-save"
      title={title}
      isEmpty={labels.length === 0}
      contentWhenEmpty={contentWhenEmpty}
      isEditable={!isArchive}
      isEditing={isEditing}
      isSavingEdits={isSavingEdits}
      isSaveDisabled={labelErrors.length > 0}
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
                color={shouldBeRed(label, index) ? 'red' : 'blue'}
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
          {labelErrors.length > 0 && (
            <Alert
              data-testid="label-error-alert"
              variant={AlertVariant.danger}
              isInline
              title="Label validation errors:"
              aria-live="polite"
              isPlain
            >
              <ul>
                {labelErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </Alert>
          )}
        </>
      }
      onEditClick={() => {
        setUnsavedLabels(labels);
        setIsEditing(true);
      }}
      onSaveEditsClick={async () => {
        if (labelErrors.length > 0) {
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
