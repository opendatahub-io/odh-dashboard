import * as React from 'react';
import { Alert, FormGroup, Select, SelectOption, Skeleton } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from 'pages/projects/types';
import { CreatingInferenceServiceObject } from '../../types';
import useModelFramework from './useModelFramework';
import { SupportedModelFormats } from 'k8sTypes';

type InferenceServiceFrameworkSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  modelContext?: SupportedModelFormats[];
};

const InferenceServiceFrameworkSection: React.FC<InferenceServiceFrameworkSectionProps> = ({
  data,
  setData,
  modelContext,
}) => {
  const [isOpen, setOpen] = React.useState<boolean>(false);

  const [modelsContextLoaded, loaded, loadError] = useModelFramework(
    modelContext ? undefined : data.servingRuntimeName,
    data.project,
  );
  const models = modelContext || modelsContextLoaded;

  if (!modelContext && !loaded && data.project !== '') {
    return <Skeleton />;
  }

  if (loadError) {
    return (
      <Alert title="Error loading models" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  return (
    <FormGroup label="Model framework">
      <Select
        removeFindDomNode
        id="inference-service-framework-selection"
        isOpen={isOpen}
        placeholderText={
          models.length === 0 ? 'No frameworks available to select' : 'Select a framework'
        }
        isDisabled={models.length === 0}
        onToggle={(open) => setOpen(open)}
        onSelect={(_, option) => {
          if (typeof option === 'string') {
            const [name, version] = option.split(' - ');
            const valueSelected = models.find((element) =>
              version
                ? element.name === name && element.version === version
                : element.name === name,
            );

            if (valueSelected) {
              setData('format', { name, version });
            }
            setOpen(false);
          }
        }}
        selections={
          data.format.version ? `${data.format.name} - ${data.format.version}` : data.format.name
        }
      >
        {models.map((framework) => {
          const name = framework.version
            ? `${framework.name} - ${framework.version}`
            : `${framework.name}`;
          return <SelectOption key={name} value={name} />;
        })}
      </Select>
    </FormGroup>
  );
};

export default InferenceServiceFrameworkSection;
