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
  PopoverPosition,
  Tooltip,
  Truncate,
} from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import truncateStyles from '@patternfly/react-styles/css/components/Truncate/truncate';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { useBrowserStorage } from '~/components/browserStorage/BrowserStorageContext';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { getDescriptionFromK8sResource, getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';
import { ServiceKind } from '~/k8sTypes';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import WhosMyAdministrator from '~/components/WhosMyAdministrator';
import InlineTruncatedClipboardCopy from '~/components/InlineTruncatedClipboardCopy';
import ModelRegistrySelectIcon from '~/images/icons/ModelRegistrySelectIcon';
import { getServerAddress } from './utils';

const MODEL_REGISTRY_FAVORITE_STORAGE_KEY = 'odh.dashboard.model.registry.favorite';

type ModelRegistrySelectorProps = {
  modelRegistry: string;
  onSelection: (modelRegistry: string) => void;
  primary?: boolean;
  isFullWidth?: boolean;
  hasError?: boolean;
};

const ModelRegistrySelector: React.FC<ModelRegistrySelectorProps> = ({
  modelRegistry,
  onSelection,
  primary,
  isFullWidth,
  hasError,
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
      placeholder="Select a model registry"
      dataTestId="model-registry-selector-dropdown"
      toggleProps={{ id: 'download-steps-logs-toggle', status: hasError ? 'danger' : undefined }}
      toggleLabel={toggleLabel}
      aria-label="Model registry toggle"
      previewDescription={false}
      onChange={(key) => {
        updatePreferredModelRegistry(
          modelRegistryServices.find((obj) => obj.metadata.name === key),
        );
        onSelection(key);
      }}
      isFullWidth={isFullWidth}
      maxMenuHeight="300px"
      popperProps={{ maxWidth: '400px' }}
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
    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>
        <Icon>
          <ModelRegistrySelectIcon
            alt=""
            style={{
              width: 'var(--pf-t--global--icon--size--font--xl)',
              height: 'var(--pf-t--global--icon--size--font--xl)',
              margin:
                'var(--pf-t--global--spacer--lg) var(--pf-t--global--spacer--xs) 0 var(--pf-t--global--spacer--sm)',
            }}
          />
        </Icon>
      </FlexItem>
      <FlexItem>
        <Bullseye>Model registry</Bullseye>
      </FlexItem>
      <FlexItem>{selector}</FlexItem>
      {selection && (
        <FlexItem>
          <Popover
            aria-label="Model registry description popover"
            data-testid="mr-details-popover"
            position="right"
            headerContent={
              // FIXME 'Truncate' can be removed once PF bug is resolved
              // https://github.com/patternfly/patternfly/issues/7340
              <Truncate content={`${getDisplayNameFromK8sResource(selection)} details`} />
            }
            bodyContent={
              <DescriptionList>
                <DescriptionListGroup>
                  <DescriptionListTerm>Description</DescriptionListTerm>
                  <DescriptionListDescription
                    className={
                      !getDescriptionFromK8sResource(selection) ? text.textColorDisabled : ''
                    }
                  >
                    {getDescriptionFromK8sResource(selection) || 'No description'}
                  </DescriptionListDescription>
                </DescriptionListGroup>
                <DescriptionListGroup>
                  <DescriptionListTerm>Server URL</DescriptionListTerm>
                  <DescriptionListDescription>
                    <InlineTruncatedClipboardCopy
                      textToCopy={`https://${getServerAddress(selection)}`}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </DescriptionList>
            }
          >
            <Button variant="link" icon={<InfoCircleIcon />} data-testid="view-details-button">
              View details
            </Button>
          </Popover>
        </FlexItem>
      )}
      <FlexItem align={{ default: 'alignRight' }}>
        <WhosMyAdministrator
          buttonLabel="Need another registry?"
          headerContent="Need another registry?"
          leadText="To request access to a new or existing model registry, contact your administrator."
          contentTestId="model-registry-help-content"
          linkTestId="model-registry-help-button"
          popoverPosition={PopoverPosition.left}
        />
      </FlexItem>
    </Flex>
  );
};

export default ModelRegistrySelector;
