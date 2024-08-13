import * as React from 'react';
import {
  SelectVariant,
  Select,
  SelectGroup,
  SelectOption,
} from '@patternfly/react-core/deprecated';
import {
  Bullseye,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Popover,
  Tooltip,
} from '@patternfly/react-core';
import truncateStyles from '@patternfly/react-styles/css/components/Truncate/truncate';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { useBrowserStorage } from '~/components/browserStorage';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { ProjectObjectType, typedObjectImage } from '~/concepts/design/utils';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
} from '~/concepts/k8s/utils';
import { ServiceKind } from '~/k8sTypes';

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
  const { modelRegistryServices, updatePreferredModelRegistry } = React.useContext(
    ModelRegistrySelectorContext,
  );
  const selection = modelRegistryServices.find((mr) => mr.metadata.name === modelRegistry);
  const [isOpen, setIsOpen] = React.useState(false);
  const [favorites, setFavorites] = useBrowserStorage<string[]>(
    MODEL_REGISTRY_FAVORITE_STORAGE_KEY,
    [],
  );

  const selectionDisplayName = selection ? getDisplayNameFromK8sResource(selection) : modelRegistry;

  const toggleLabel =
    modelRegistryServices.length === 0 ? 'No model registries' : selectionDisplayName;

  const getMRSelectDescription = (mr: ServiceKind) => {
    const desc = getDescriptionFromK8sResource(mr);
    if (!desc) {
      return;
    }
    const tooltipContent = (
      <DescriptionList>
        <DescriptionListGroup>
          <DescriptionListTerm>{`${getDisplayNameFromK8sResource(
            mr,
          )} description`}</DescriptionListTerm>
          <DescriptionListDescription>{desc}</DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    );
    return (
      <Tooltip content={tooltipContent} isContentLeftAligned>
        <span className={truncateStyles.truncate}>
          <span className={truncateStyles.truncateStart}>{desc}</span>
        </span>
      </Tooltip>
    );
  };

  const options = [
    <SelectGroup label="Select a model registry" key="all">
      {modelRegistryServices.map((mr) => (
        <SelectOption
          id={mr.metadata.name}
          key={mr.metadata.name}
          value={getResourceNameFromK8sResource(mr)}
          description={getMRSelectDescription(mr)}
          isFavorite={favorites.includes(mr.metadata.name)}
        >
          {getDisplayNameFromK8sResource(mr)}
        </SelectOption>
      ))}
    </SelectGroup>,
  ];

  const selector = (
    <Select
      data-testid="model-registry-selector-dropdown"
      toggleId="model-registry-selector-dropdown"
      variant={SelectVariant.single}
      onToggle={() => setIsOpen(!isOpen)}
      isDisabled={modelRegistryServices.length === 0}
      onSelect={(_e, value) => {
        setIsOpen(false);
        updatePreferredModelRegistry(
          modelRegistryServices.find((obj) => obj.metadata.name === value),
        );
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
        {selection && getDescriptionFromK8sResource(selection) && (
          <FlexItem>
            <Popover
              aria-label="Model registry description popover"
              headerContent={getDisplayNameFromK8sResource(selection)}
              bodyContent={getDescriptionFromK8sResource(selection)}
            >
              <Button variant="link" icon={<InfoCircleIcon />}>
                View Description
              </Button>
            </Popover>
          </FlexItem>
        )}
      </Flex>
    </Flex>
  );
};

export default ModelRegistrySelector;
