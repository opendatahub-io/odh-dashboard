import * as React from 'react';
import {
  Alert,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Skeleton,
} from '@patternfly/react-core';
import { Select, SelectOption } from '@patternfly/react-core/deprecated';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { SupportedModelFormats } from '~/k8sTypes';
import useModelFramework from './useModelFramework';

type InferenceServiceFrameworkSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  modelContext?: SupportedModelFormats[];
  registeredModelFormat?: string;
};

const InferenceServiceFrameworkSection: React.FC<InferenceServiceFrameworkSectionProps> = ({
  data,
  setData,
  modelContext,
  registeredModelFormat,
}) => {
  const [isOpen, setOpen] = React.useState(false);

  const [modelsContextLoaded, loaded, loadError] = useModelFramework(
    modelContext ? undefined : data.servingRuntimeName,
    data.project,
  );
  const models = modelContext || modelsContextLoaded;

  if (!modelContext && !loaded && data.servingRuntimeName !== '') {
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
    <FormGroup label="Model framework (name - version)" isRequired>
      <Select
        toggleId="inference-service-framework-selection"
        id="inference-service-framework-selection"
        isOpen={isOpen}
        placeholderText={
          models.length === 0 ? 'No frameworks available to select' : 'Select a framework'
        }
        isDisabled={models.length === 0}
        onToggle={(e, open) => setOpen(open)}
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
      {registeredModelFormat && models.length !== 0 && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem>The source model format is {registeredModelFormat}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </FormGroup>
  );
};

export default InferenceServiceFrameworkSection;
