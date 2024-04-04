import * as React from 'react';
import {
  SelectVariant,
  Select,
  SelectGroup,
  SelectOption,
} from '@patternfly/react-core/deprecated';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { useBrowserStorage } from '~/components/browserStorage';

const MODEL_REGISTRY_FAVORITE_STORAGE_KEY = 'odh.dashboard.model.registry.favorite';

const ModelRegistrySelector: React.FC = () => {
  const { modelRegistries, preferredModelRegistry, updatePreferredModelRegistry } =
    React.useContext(ModelRegistryContext);
  const [favorites, setFavorites] = useBrowserStorage<string[]>(
    MODEL_REGISTRY_FAVORITE_STORAGE_KEY,
    [],
  );

  const [isOpen, setIsOpen] = React.useState(false);

  const options = [
    <SelectGroup label="All model registries" key="all">
      {modelRegistries.map((modelRegistry) => (
        <SelectOption
          id={modelRegistry.metadata.name}
          key={modelRegistry.metadata.name}
          value={modelRegistry.metadata.name}
          isFavorite={favorites.includes(modelRegistry.metadata.name)}
        />
      ))}
    </SelectGroup>,
  ];

  return (
    <Select
      data-testid="model-registry-selector-dropdown"
      variant={SelectVariant.single}
      onToggle={() => setIsOpen(!isOpen)}
      onSelect={(_e, value) => {
        setIsOpen(false);
        updatePreferredModelRegistry(modelRegistries.find((obj) => obj.metadata.name === value));
      }}
      selections={preferredModelRegistry?.metadata.name}
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
};

export default ModelRegistrySelector;
