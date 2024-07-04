import * as React from 'react';
import { Alert, FormGroup, Skeleton } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { SupportedModelFormats } from '~/k8sTypes';
import SimpleSelect from '~/components/SimpleSelect';
import useModelFramework from './useModelFramework';

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
  const [modelsContextLoaded, loaded, loadError] = useModelFramework(
    modelContext ? undefined : data.servingRuntimeName,
    data.project,
  );
  const models = modelContext || modelsContextLoaded;
  const { name: dataFormatName, version: dataFormatVersion } = data.format;
  const selectedDataFormat = models.find((element) =>
    dataFormatVersion
      ? element.name === dataFormatName && element.version === dataFormatVersion
      : element.name === dataFormatName,
  );
  const placeholderText =
    models.length === 0 ? 'No frameworks available to select' : 'Select a framework';
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
      <SimpleSelect
        dataTestId="inference-service-framework-selection"
        isDisabled={models.length === 0}
        options={models.map((framework) => {
          const name = framework.version
            ? `${framework.name} - ${framework.version}`
            : `${framework.name}`;
          return {
            key: name,
            children: name,
          };
        })}
        isFullWidth
        toggleLabel={
          selectedDataFormat && dataFormatVersion
            ? `${dataFormatName} - ${dataFormatVersion}`
            : dataFormatName || placeholderText
        }
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
          }
        }}
      />
    </FormGroup>
  );
};

export default InferenceServiceFrameworkSection;
