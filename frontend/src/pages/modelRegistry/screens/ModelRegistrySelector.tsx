import * as React from 'react';
import {
  SelectVariant,
  Select,
  SelectGroup,
  SelectOption,
} from '@patternfly/react-core/deprecated';
import { Bullseye, Flex, FlexItem } from '@patternfly/react-core';
import { useBrowserStorage } from '~/components/browserStorage';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { ProjectObjectType, typedObjectImage } from '~/concepts/design/utils';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

const MODEL_REGISTRY_FAVORITE_STORAGE_KEY = 'odh.dashboard.model.registry.favorite';

type ModelRegistrySelectorProps = {
  modelRegistry: string;
  onSelection: (modelRegistry: string) => void;
  primary?: boolean;
};

const ModelRegistrySelector: React.FC<ModelRegistrySelectorProps> = ({
  modelRegistry,
  onSelection,
  primary,
}) => {
  const { modelRegistries, updatePreferredModelRegistry } = React.useContext(
    ModelRegistrySelectorContext,
  );
  const selection = modelRegistries.find((mr) => mr.metadata.name === modelRegistry);
  const [isOpen, setIsOpen] = React.useState(false);
  const [favorites, setFavorites] = useBrowserStorage<string[]>(
    MODEL_REGISTRY_FAVORITE_STORAGE_KEY,
    [],
  );

  const selectionDisplayName = selection ? getDisplayNameFromK8sResource(selection) : modelRegistry;

  const toggleLabel = modelRegistries.length === 0 ? 'No model registries' : selectionDisplayName;

  const options = [
    <SelectGroup label="Select a model registry" key="all">
      {modelRegistries.map((mr) => (
        <SelectOption
          id={mr.metadata.name}
          key={mr.metadata.name}
          value={getDisplayNameFromK8sResource(mr)}
          isFavorite={favorites.includes(mr.metadata.name)}
        />
      ))}
    </SelectGroup>,
  ];

  const selector = (
    <Select
      data-testid="model-registry-selector-dropdown"
      toggleId="model-registry-selector-dropdown"
      variant={SelectVariant.single}
      onToggle={() => setIsOpen(!isOpen)}
      isDisabled={modelRegistries.length === 0}
      onSelect={(_e, value) => {
        setIsOpen(false);
        updatePreferredModelRegistry(modelRegistries.find((obj) => obj.metadata.name === value));
        if (typeof value === 'string') {
          onSelection(value);
        }
      }}
      selections={toggleLabel}
      isOpen={isOpen}
      isGrouped
      onFavorite={(itemId, isFavorite) => {
        if (isFavorite) {
          setFavorites(favorites.filter((id) => id !== itemId));
        } else {
          setFavorites([...favorites, itemId]);
        }
      }}
      favorites={favorites}
    >
      {options}
    </Select>
  );

  if (primary) {
    return selector;
  }

  return (
    <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
      <img
        src={typedObjectImage(ProjectObjectType.project)}
        alt=""
        style={{ height: 'var(--pf-v5-global--icon--FontSize--lg)' }}
      />
      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <Bullseye>Model registry</Bullseye>
        </FlexItem>
        <FlexItem>{selector}</FlexItem>
      </Flex>
    </Flex>
  );
};

export default ModelRegistrySelector;
