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
  const [selectedModel, setSelectedModel] = useState('');

  useEffect(() => {
    const getModelNames = async () => {
      try {
        const modelInfos = await fetchNIMModelNames(dashboardNamespace);
        if (modelInfos && modelInfos.length > 0) {
          const fetchedOptions = modelInfos.flatMap((modelInfo) =>
            modelInfo.tags.map((tag) => ({
              key: `${modelInfo.name}-${tag}`,
              label: `${modelInfo.displayName} - ${tag}`,
            })),
          );
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

  const getSupportedModelFormatsInfo = (key: string) => {
    const lastHyphenIndex = key.lastIndexOf('-');
    const name = key.slice(0, lastHyphenIndex);
    const version = key.slice(lastHyphenIndex + 1);

    const modelInfo = modelList.find((model) => model.name === name);
    if (modelInfo) {
      return {
        name: modelInfo.name,
        version,
      };
    }
    return null;
  };

  const getNIMImageName = (key: string) => {
    const lastHyphenIndex = key.lastIndexOf('-');
    const name = key.slice(0, lastHyphenIndex);
    const version = key.slice(lastHyphenIndex + 1);

    const imageInfo = modelList.find((model) => model.name === name);
    if (imageInfo) {
      return `nvcr.io/${imageInfo.namespace}/${name}:${version}`;
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
        value={selectedModel}
        onChange={(key) => {
          setSelectedModel(key);
          const supportedModelInfo = getSupportedModelFormatsInfo(key);
          if (supportedModelInfo) {
            setServingRuntimeData('supportedModelFormatsInfo', supportedModelInfo);
            setServingRuntimeData('imageName', getNIMImageName(key));
            setInferenceServiceData('format', { name: supportedModelInfo.name });
            setError('');
          } else {
            setError('Error: Model not found.');
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
