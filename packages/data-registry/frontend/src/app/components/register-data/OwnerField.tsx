import React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { TypeaheadSelect } from '@patternfly/react-templates';
import { useSettings } from 'mod-arch-core';
import { Controller, useFormContext } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';

const UNASSIGNED = 'Unassigned';

const OwnerField: React.FC = () => {
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext<RegisterDataFormData>();
  const { userSettings } = useSettings();
  const userId = userSettings?.userId || '';
  const currentOwner = watch('owner');

  const ownerOptions = React.useMemo(() => {
    const options = [
      { content: UNASSIGNED, value: UNASSIGNED, selected: currentOwner === UNASSIGNED },
    ];
    if (userId) {
      options.unshift({ content: userId, value: userId, selected: currentOwner === userId });
    }
    if (currentOwner && currentOwner !== userId && currentOwner !== UNASSIGNED) {
      options.push({ content: currentOwner, value: currentOwner, selected: true });
    }
    return options;
  }, [userId, currentOwner]);

  return (
    <Controller
      name="owner"
      control={control}
      render={({ field }) => (
        <FormGroup label="Owner" isRequired fieldId="asset-owner">
          <TypeaheadSelect
            key={`${userId}-${currentOwner}`}
            id="asset-owner"
            placeholder="Select or type owner"
            initialOptions={ownerOptions}
            onSelect={(_event, value) => {
              field.onChange(String(value));
            }}
            onClearSelection={() => field.onChange('')}
            isCreatable
            createOptionMessage={(newValue) => `Use "${newValue}"`}
            toggleWidth="100%"
            data-testid="asset-owner-input"
          />
          {errors.owner ? (
            <FormHelperText>
              <HelperText>
                <HelperTextItem variant="error">{errors.owner.message}</HelperTextItem>
              </HelperText>
            </FormHelperText>
          ) : null}
        </FormGroup>
      )}
    />
  );
};

export default OwnerField;
