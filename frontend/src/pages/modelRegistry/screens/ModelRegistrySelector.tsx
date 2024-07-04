import * as React from 'react';
import {
  Bullseye,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  Flex,
  FlexItem,
  MenuToggle,
  Popover,
  Select,
  SelectGroup,
  SelectList,
  SelectOption,
  Tooltip,
} from '@patternfly/react-core';
import truncateStyles from '@patternfly/react-styles/css/components/Truncate/truncate';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { useBrowserStorage } from '~/components/browserStorage';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { ProjectObjectType, typedObjectImage } from '~/concepts/design/utils';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { ModelRegistryKind } from '~/k8sTypes';

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

  const getMRSelectDescription = (mr: ModelRegistryKind) => {
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
      <SelectList>
        {modelRegistries.map((mr) => (
          <SelectOption
            id={mr.metadata.name}
            key={mr.metadata.name}
            value={getDisplayNameFromK8sResource(mr)}
            description={getMRSelectDescription(mr)}
            isFavorited={favorites.includes(mr.metadata.name)}
          >
            {getDisplayNameFromK8sResource(mr)}
          </SelectOption>
        ))}
      </SelectList>
    </SelectGroup>,
  ];

  const createFavorites = (favIds: string[]) => {
    const favorite: JSX.Element[] = [];

    options.forEach((item) => {
      if (item.type === SelectList) {
        item.props.children.filter(
          (child: JSX.Element) => favIds.includes(child.props.value) && favorite.push(child),
        );
      } else if (item.type === SelectGroup) {
        item.props.children.props.children.filter(
          (child: JSX.Element) => favIds.includes(child.props.value) && favorite.push(child),
        );
      } else if (favIds.includes(item.props.value)) {
        favorite.push(item);
      }
    });

    return favorite;
  };

  const selector = (
    <Select
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          data-testid="model-registry-selector-dropdown"
          aria-label="Model registry toggle"
          id="download-steps-logs-toggle"
          onClick={() => setIsOpen(!isOpen)}
          isExpanded={isOpen}
          isDisabled={modelRegistries.length === 0}
        >
          {toggleLabel}
        </MenuToggle>
      )}
      onSelect={(_e, value) => {
        setIsOpen(false);
        updatePreferredModelRegistry(modelRegistries.find((obj) => obj.metadata.name === value));
        if (typeof value === 'string') {
          onSelection(value);
        }
      }}
      selected={toggleLabel}
      onOpenChange={(open) => setIsOpen(open)}
      isOpen={isOpen}
      onActionClick={(event: React.MouseEvent, value: string, actionId: string) => {
        event.stopPropagation();
        if (actionId === 'fav') {
          const isFavorited = favorites.includes(value);
          if (isFavorited) {
            setFavorites(favorites.filter((id) => id !== value));
          } else {
            setFavorites([...favorites, value]);
          }
        }
      }}
    >
      {favorites.length > 0 && (
        <React.Fragment key="favorites-group">
          <SelectGroup label="Favorites">
            <SelectList>{createFavorites(favorites)}</SelectList>
          </SelectGroup>
          <Divider />
        </React.Fragment>
      )}
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
