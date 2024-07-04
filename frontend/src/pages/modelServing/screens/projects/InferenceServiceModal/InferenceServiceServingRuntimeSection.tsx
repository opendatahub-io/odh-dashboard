import * as React from 'react';
import { Alert, FormGroup, Skeleton, Text } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { ServingRuntimeKind } from '~/k8sTypes';
import useServingRuntimes from '~/pages/modelServing/useServingRuntimes';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import SimpleSelect from '~/components/SimpleSelect';

type InferenceServiceServingRuntimeSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  currentServingRuntime?: ServingRuntimeKind;
};

const InferenceServiceServingRuntimeSection: React.FC<
  InferenceServiceServingRuntimeSectionProps
> = ({ data, setData, currentServingRuntime }) => {
  const [servingRuntimes, loaded, loadError] = useServingRuntimes(
    data.project,
    data.project === '' || !!currentServingRuntime,
  );

  const selectedServingRuntime = servingRuntimes.find(
    (servingRuntime) => servingRuntime.metadata.name === data.servingRuntimeName,
  );

  const placeholderText =
    servingRuntimes.length === 0 ? 'No model servers available to select' : 'Select a model server';

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
      <SimpleSelect
        dataTestId="inference-service-model-selection"
        isDisabled={servingRuntimes.length === 0}
        options={servingRuntimes.map((servingRuntime) => ({
          key: servingRuntime.metadata.name,
          children: getDisplayNameFromK8sResource(servingRuntime),
        }))}
        isFullWidth
        selected={data.servingRuntimeName}
        toggleLabel={
          (selectedServingRuntime && getDisplayNameFromK8sResource(selectedServingRuntime)) ||
          placeholderText
        }
        onSelect={(_, option) => {
          if (typeof option === 'string') {
            setData('servingRuntimeName', option);
            setData('format', '');
          }
        }}
      />
    </FormGroup>
  );
};

export default InferenceServiceServingRuntimeSection;
