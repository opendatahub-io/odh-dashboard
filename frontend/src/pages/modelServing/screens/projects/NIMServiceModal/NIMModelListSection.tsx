import * as React from 'react';
import { HelperText, HelperTextItem, FormGroup } from '@patternfly/react-core';
import { fetchNIMModelNames, ModelInfo } from '~/pages/modelServing/screens/projects/utils';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import {
  CreatingInferenceServiceObject,
  CreatingServingRuntimeObject,
} from '~/pages/modelServing/screens/types';
import TypeaheadSelect, { TypeaheadSelectOption } from '~/components/TypeaheadSelect';

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
  const [modelList, setModelList] = React.useState<ModelInfo[]>([]);
  const [options, setOptions] = React.useState<TypeaheadSelectOption[]>([]);
  const [selectedModel, setSelectedModel] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    const getModelNames = async () => {
      try {
        const modelInfos = await fetchNIMModelNames();
        if (modelInfos && modelInfos.length > 0) {
          const normalizeVersion = (tag: string) => {
            if (/^\d+(\.\d+)*$/.test(tag)) {
              const parts = tag.split('.').map(Number);
              while (parts.length < 3) {
                parts.push(0);
              }
              return parts.join('.');
            }
            return tag;
          };
          const seen = new Set<string>();
          const fetchedOptions = modelInfos
            .flatMap((modelInfo) =>
              modelInfo.tags.map((tag) => {
                const normalizedTag = normalizeVersion(tag);
                const value: string | number = `${modelInfo.name}-${normalizedTag}`;
                const content = `${modelInfo.displayName} - ${normalizedTag}`;

                if (!seen.has(value.toString())) {
                  seen.add(value.toString());
                  const option: TypeaheadSelectOption = { value, content };
                  return option;
                }
                return null;
              }),
            )
            .filter((option): option is TypeaheadSelectOption => option !== null);

          setModelList(modelInfos);
          setOptions(fetchedOptions);
          setError('');

          if (isEditing) {
            const modelName = inferenceServiceData.format.name;
            const modelInfo = modelInfos.find((model) => model.name === modelName);
            if (modelInfo && modelInfo.tags.length > 0) {
              setSelectedModel(`${modelInfo.name}-${modelInfo.tags[0]}`);
            } else {
              setSelectedModel(modelName);
            }
          }
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
  }, [isEditing, inferenceServiceData.format.name]);

  const getSupportedModelFormatsInfo = (key: string) => {
    const lastHyphenIndex = key.lastIndexOf('-');
    if (lastHyphenIndex === -1) {
      return null;
    }
    const name = key.slice(0, lastHyphenIndex);
    const version = key.slice(lastHyphenIndex + 1);
    const modelInfo = modelList.find((model) => model.name === name);
    return modelInfo ? { name: modelInfo.name, version } : null;
  };

  const getNIMImageName = (key: string) => {
    const lastHyphenIndex = key.lastIndexOf('-');
    if (lastHyphenIndex === -1) {
      return '';
    }
    const name = key.slice(0, lastHyphenIndex);
    const version = key.slice(lastHyphenIndex + 1);
    const imageInfo = modelList.find((model) => model.name === name);
    return imageInfo ? `nvcr.io/${imageInfo.namespace}/${name}:${version}` : '';
  };

  const onSelect = (
    _event: React.MouseEvent | React.KeyboardEvent | undefined,
    key: string | number,
  ) => {
    if (typeof key !== 'string' || isEditing) {
      return;
    }
    setSelectedModel(key);
    const modelInfo = getSupportedModelFormatsInfo(key);
    if (modelInfo) {
      setServingRuntimeData('supportedModelFormatsInfo', modelInfo);
      setServingRuntimeData('imageName', getNIMImageName(key));
      setInferenceServiceData('format', { name: modelInfo.name });
      setError('');
    } else {
      setError('Error: Model not found.');
    }
  };

  return (
    <FormGroup label="NVIDIA NIM" fieldId="nim-model-list-selection" isRequired>
      <TypeaheadSelect
        selectOptions={options}
        selected={selectedModel}
        isScrollable
        isDisabled={isEditing}
        onSelect={onSelect}
        placeholder={isEditing ? selectedModel : 'Select NVIDIA NIM to deploy'}
        noOptionsFoundMessage={(filter) => `No results found for "${filter}"`}
        isCreatable={false}
        allowClear={!isEditing}
        onClearSelection={() => {
          if (!isEditing) {
            setSelectedModel('');
            setServingRuntimeData('supportedModelFormatsInfo', undefined);
            setServingRuntimeData('imageName', undefined);
            setInferenceServiceData('format', { name: '' });
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
