import * as React from 'react';
import { Alert, FormGroup, Skeleton, Text } from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { ServingRuntimeKind } from '~/k8sTypes';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

type InferenceServiceServingRuntimeSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  currentServingRuntime?: ServingRuntimeKind;
};

const InferenceServiceServingRuntimeSection: React.FC<
  InferenceServiceServingRuntimeSectionProps
> = ({ data, setData, currentServingRuntime }) => {
  const [isOpen, setOpen] = React.useState(false);

  const [servingRuntimes, loaded, loadError] = useServingRuntimes(
    data.project,
    data.project === '' || !!currentServingRuntime,
  );

  if (!loaded && !currentServingRuntime && data.project !== '') {
    return <Skeleton />;
  }

  if (loadError) {
    return (
      <Alert title="Error loading model servers" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  if (currentServingRuntime) {
    return (
      <FormGroup label="Model server">
        <Text>{getDisplayNameFromK8sResource(currentServingRuntime)}</Text>
      </FormGroup>
    );
  }

  return (
    <FormGroup label="Model servers" isRequired>
      <Select
        toggleId="inference-service-model-selection"
        id="inference-service-model-selection"
        isOpen={isOpen}
        placeholderText={
          servingRuntimes.length === 0
            ? 'No model servers available to select'
            : 'Select a model server'
        }
        isDisabled={servingRuntimes.length === 0}
        onToggle={(e, open) => setOpen(open)}
        onSelect={(_, option) => {
          if (typeof option === 'string') {
            setData('servingRuntimeName', option);
            setData('format', '');
            setOpen(false);
          }
        }}
        selections={data.servingRuntimeName}
      >
        {servingRuntimes.map((servingRuntime) => (
          <SelectOption key={servingRuntime.metadata.name} value={servingRuntime.metadata.name}>
            {getDisplayNameFromK8sResource(servingRuntime)}
          </SelectOption>
        ))}
      </Select>
    </FormGroup>
  );
};

export default InferenceServiceServingRuntimeSection;
