import * as React from 'react';
import { useEffect, useState } from 'react';
import { FormGroup, HelperText, HelperTextItem } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
} from '~/pages/modelServing/screens/types';
import SimpleSelect from '~/components/SimpleSelect';
import { fetchNIMModelNames, ModelInfo } from '~/pages/modelServing/screens/projects/utils';
import { useDashboardNamespace } from '~/redux/selectors';

type NIMModelListSectionProps = {
  inferenceServiceData: CreatingInferenceServiceObject;
  setInferenceServiceData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
  setServingRuntimeData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  isEditing?: boolean;
};

const NIMModelListSection: React.FC<NIMModelListSectionProps> = ({
  inferenceServiceData,
  setInferenceServiceData,
  setServingRuntimeData,
  isEditing,
}) => {
  const [options, setOptions] = useState<{ key: string; label: string }[]>([]);
  const [modelList, setModelList] = useState<ModelInfo[]>([]);
  const { dashboardNamespace } = useDashboardNamespace();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const getModelNames = async () => {
      try {
        const modelInfos = await fetchNIMModelNames(dashboardNamespace);
        if (modelInfos && modelInfos.length > 0) {
          const fetchedOptions = modelInfos.map((modelInfo) => ({
            key: modelInfo.name,
            label: `${modelInfo.displayName} - ${modelInfo.latestTag}`,
          }));
          setModelList(modelInfos);
          setOptions(fetchedOptions);
          setError('');
        } else {
          setError('No NVIDIA NIM models found. Please check the installation.');
          setOptions([]);
        }
      } catch (err) {
        setError('There was a problem fetching the NIM models. Please try again later.');
        setOptions([]);
      }
    };
    getModelNames();
  }, [dashboardNamespace]);

  const getSupportedModelFormatsInfo = (name: string) => {
    const modelInfo = modelList.find((model) => model.name === name);
    if (modelInfo) {
      return {
        name: modelInfo.name,
        version: modelInfo.latestTag,
      };
    }
    return null;
  };

  const getNIMImageName = (name: string) => {
    const imageInfo = modelList.find((model) => model.name === name);
    if (imageInfo) {
      return `nvcr.io/${imageInfo.namespace}/${name}:${imageInfo.latestTag}`;
    }
    return '';
  };

  return (
    <FormGroup label="NVIDIA NIM" fieldId="nim-model-list-selection" isRequired>
      <SimpleSelect
        isFullWidth
        isDisabled={isEditing || options.length === 0}
        id="nim-model-list-selection"
        dataTestId="nim-model-list-selection"
        aria-label="Select NVIDIA NIM to deploy"
        options={options}
        placeholder={
          options.length === 0
            ? 'No NIM models available'
            : isEditing
            ? inferenceServiceData.name
            : 'Select NVIDIA NIM to deploy'
        }
        value={inferenceServiceData.format.name}
        onChange={(name) => {
          const supportedModelInfo = getSupportedModelFormatsInfo(name);

          if (supportedModelInfo) {
            setServingRuntimeData('supportedModelFormatsInfo', supportedModelInfo);
            setServingRuntimeData('imageName', getNIMImageName(name));
            setInferenceServiceData('format', { name });
            setError('');
          } else {
            setError('Error: Model not found.'); // Set error when model is not found
          }
        }}
      />
      {error && (
        <HelperText>
          <HelperTextItem variant="error">{error}</HelperTextItem>
        </HelperText>
      )}
    </FormGroup>
  );
};

export default NIMModelListSection;
