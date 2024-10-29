import * as React from 'react';
import {
  Bullseye,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Icon,
  Popover,
  Tooltip,
} from '@patternfly/react-core';
import truncateStyles from '@patternfly/react-styles/css/components/Truncate/truncate';
import { InfoCircleIcon, BlueprintIcon } from '@patternfly/react-icons';
import { useBrowserStorage } from '~/components/browserStorage';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { ServiceKind } from '~/k8sTypes';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';

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

  const allOptions: SimpleSelectOption[] = modelRegistryServices.map((mr) => ({
    key: mr.metadata.name,
    label: mr.metadata.name,
    dropdownLabel: getDisplayNameFromK8sResource(mr),
    description: getMRSelectDescription(mr),
    isFavorited: favorites.includes(mr.metadata.name),
  }));

  const favoriteOptions = (favIds: string[]) =>
    allOptions.filter((option) => favIds.includes(option.key));

  const selector = (
    <SimpleSelect
      isScrollable
      dataTestId="model-registry-selector-dropdown"
      toggleProps={{ id: 'download-steps-logs-toggle' }}
      toggleLabel={toggleLabel}
      aria-label="Model registry toggle"
      previewDescription={false}
      onChange={(key) => {
        updatePreferredModelRegistry(
          modelRegistryServices.find((obj) => obj.metadata.name === key),
        );
        onSelection(key);
      }}
      popperProps={{ maxWidth: undefined }}
      value={selection?.metadata.name}
      groupedOptions={[
        ...(favorites.length > 0
          ? [
              {
                key: 'favorites-group',
                label: 'Favorites',
                options: favoriteOptions(favorites),
              },
            ]
          : []),
        {
          key: 'all',
          label: 'All model registries',
          options: allOptions,
        },
      ]}
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
    />
  );

  if (primary) {
    return selector;
  }

  return (
    <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
      <Icon>
        <BlueprintIcon />
      </Icon>
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
