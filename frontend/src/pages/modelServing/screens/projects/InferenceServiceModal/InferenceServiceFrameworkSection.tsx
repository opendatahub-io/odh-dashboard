import * as React from 'react';
import {
  Alert,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import { CreatingInferenceServiceObject } from '#~/pages/modelServing/screens/types';
import { SupportedModelFormats } from '#~/k8sTypes';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import useModelFramework from './useModelFramework';

type InferenceServiceFrameworkSectionProps = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  modelContext?: SupportedModelFormats[];
  registeredModelFormat?: string;
  servingRuntimeName?: string;
};

const InferenceServiceFrameworkSection: React.FC<InferenceServiceFrameworkSectionProps> = ({
  data,
  setData,
  modelContext,
  registeredModelFormat,
  servingRuntimeName,
}) => {
  const [modelsContextLoaded, loaded, loadError] = useModelFramework(
    modelContext ? undefined : data.servingRuntimeName,
    data.project,
  );
  const models = modelContext || modelsContextLoaded;
  const { name: dataFormatName, version: dataFormatVersion } = data.format;
  const placeholderText =
    models.length === 0 ? 'No frameworks available to select' : 'Select a framework';

  if (loadError) {
    return (
      <Alert title="Error loading models" variant="danger">
        {loadError.message}
      </Alert>
    );
  }

  return (
    <FormGroup
      label="Model framework (name - version)"
      fieldId="inference-service-framework-selection"
      isRequired
    >
      <SimpleSelect
        dataTestId="inference-service-framework-selection"
        toggleProps={{ id: 'inference-service-framework-selection' }}
        options={models.map((framework): SimpleSelectOption => {
          const name = framework.version
            ? `${framework.name} - ${framework.version}`
            : `${framework.name}`;
          return {
            optionKey: `${servingRuntimeName ?? ''}-${name}`,
            key: name,
            label: name,
          };
        })}
        isSkeleton={!modelContext && !loaded && data.servingRuntimeName !== ''}
        isFullWidth
        toggleLabel={
          dataFormatVersion ? `${dataFormatName} - ${dataFormatVersion}` : dataFormatName
        }
        placeholder={placeholderText}
        value={dataFormatName}
        onChange={(option) => {
          const [name, version] = option.split(' - ');
          setData('format', { name, version });
        }}
        popperProps={{ appendTo: 'inline' }}
      />
      {registeredModelFormat && models.length !== 0 && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              The format of the source model is {registeredModelFormat}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </FormGroup>
  );
};

export default InferenceServiceFrameworkSection;
