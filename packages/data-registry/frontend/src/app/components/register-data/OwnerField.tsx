import React from 'react';
import { FormGroup, FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { Controller, useFormContext } from 'react-hook-form';
import { RegisterDataFormData } from '~/app/schemas/registerData.schema';
import OwnerTypeaheadSelect from '~/app/components/shared/OwnerTypeaheadSelect';

const OwnerField: React.FC = () => {
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext<RegisterDataFormData>();
  const currentOwner = watch('owner');

  return (
    <Controller
      name="owner"
      control={control}
      render={({ field }) => (
        <FormGroup label="Owner" isRequired fieldId="asset-owner">
          <OwnerTypeaheadSelect
            id="asset-owner"
            value={currentOwner}
            onChange={field.onChange}
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
