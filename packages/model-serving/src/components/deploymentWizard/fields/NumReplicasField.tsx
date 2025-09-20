import React from 'react';
import { FormGroup, HelperText, HelperTextItem } from '@patternfly/react-core';
import { z } from 'zod';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import { normalizeBetween } from '@odh-dashboard/internal/utilities/utils';

// Schema
const LOWER_LIMIT = 1;
const UPPER_LIMIT = 99;

export const numReplicasFieldSchema = z.number().min(LOWER_LIMIT).max(UPPER_LIMIT);

export type NumReplicasFieldData = z.infer<typeof numReplicasFieldSchema>;

export const isValidNumReplicas = (value: unknown): value is NumReplicasFieldData => {
  return numReplicasFieldSchema.safeParse(value).success;
};

// Hook
export type NumReplicasFieldHook = {
  data: NumReplicasFieldData | undefined;
  setReplicas: (replicas: number) => void;
};

export const useNumReplicasField = (existingData?: NumReplicasFieldData): NumReplicasFieldHook => {
  const [replicaData, setReplicaData] = React.useState<NumReplicasFieldData | undefined>(
    existingData || LOWER_LIMIT,
  );

  const setReplicas = React.useCallback((replicas: number) => {
    setReplicaData(replicas);
  }, []);

  return {
    data: replicaData,
    setReplicas,
  };
};

// Component
type NumReplicasFieldProps = {
  replicaState: NumReplicasFieldHook;
};

export const NumReplicasField: React.FC<NumReplicasFieldProps> = ({ replicaState }) => {
  const { data: replicas, setReplicas } = replicaState;
  const [displayValue, setDisplayValue] = React.useState<string>(
    () => replicas?.toString() ?? LOWER_LIMIT.toString(),
  );

  const handleChange = (val: number | undefined) => {
    if (val === undefined) {
      // Allow clearing the input
      setDisplayValue('');
      return;
    }

    const newSize = Number(val);
    if (Number.isNaN(newSize)) {
      return;
    }

    // If user tries to input 0, default to lowerLimit
    const finalValue = newSize === 0 ? LOWER_LIMIT : newSize;

    if (finalValue <= UPPER_LIMIT) {
      const normalizedValue = normalizeBetween(finalValue, LOWER_LIMIT, UPPER_LIMIT);
      setReplicas(normalizedValue);
      setDisplayValue(normalizedValue.toString());
    }
  };

  const handleBlur = () => {
    // If input is empty or invalid, default to lowerLimit
    if (displayValue === '' || displayValue === '0' || Number.isNaN(Number(displayValue))) {
      setReplicas(LOWER_LIMIT);
      setDisplayValue(LOWER_LIMIT.toString());
    }
  };

  return (
    <FormGroup
      label="Number of replicas to deploy"
      fieldId="num-replicas"
      data-testid="num-replicas"
      isRequired
    >
      <NumberInputWrapper
        min={LOWER_LIMIT}
        max={UPPER_LIMIT}
        value={displayValue === '' ? undefined : Number(displayValue)}
        onChange={handleChange}
        onBlur={handleBlur}
      />
      <HelperText>
        <HelperTextItem>Non-production models typically require only one replica</HelperTextItem>
      </HelperText>
    </FormGroup>
  );
};
