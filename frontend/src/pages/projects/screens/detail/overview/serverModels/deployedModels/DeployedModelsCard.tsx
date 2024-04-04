import * as React from 'react';
import {
  Bullseye,
  CardBody,
  CardHeader,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  Flex,
  FlexItem,
  Label,
  Text,
  TextContent,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import HeaderIcon from '~/concepts/design/HeaderIcon';
import ModelServingContextProvider from '~/pages/modelServing/ModelServingContext';
import { ProjectObjectType } from '~/concepts/design/utils';
import TypeBorderedCard from '~/concepts/design/TypeBorderedCard';
import DeployedModelsGallery from './DeployedModelsGallery';

enum FilterStates {
  success = 'success',
  failed = 'failed',
}

interface DeployedModelsCardProps {
  isMultiPlatform: boolean;
  namespace?: string;
}

const DeployedModelsCard: React.FC<DeployedModelsCardProps> = ({ isMultiPlatform, namespace }) => {
  const [filteredState, setFilteredState] = React.useState<FilterStates | undefined>();

  const renderError = (message?: string): React.ReactElement => (
    <Bullseye>
      <EmptyState>
        <EmptyStateHeader
          titleText="Problem loading deployed models"
          icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
          headingLevel="h2"
        />
        <EmptyStateBody>{message}</EmptyStateBody>
      </EmptyState>
    </Bullseye>
  );

  return (
    <TypeBorderedCard objectType={ProjectObjectType.deployedModels}>
      <CardHeader>
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <HeaderIcon type={ProjectObjectType.deployedModels} size={36} />
          <FlexItem>
            <TextContent>
              <Text component="h3">
                <b>Deployed models</b>
              </Text>
            </TextContent>
          </FlexItem>
          <FlexItem>
            <ToggleGroup
              style={{ marginLeft: 'var(--pf-v5-global--spacer--md)' }}
              aria-label="Default with single selectable"
            >
              <ToggleGroupItem
                text="Successful"
                buttonId="successful-filter"
                isSelected={filteredState === FilterStates.success}
                onChange={(e, selected) =>
                  setFilteredState(selected ? FilterStates.success : undefined)
                }
              />
              <ToggleGroupItem
                text="Failed"
                buttonId="failed-filter"
                isSelected={filteredState === FilterStates.failed}
                onChange={(e, selected) =>
                  setFilteredState(selected ? FilterStates.failed : undefined)
                }
              />
            </ToggleGroup>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Label style={{ float: 'right' }}>
              {isMultiPlatform ? 'Multi-model serving enabled' : 'Single-model serving enabled'}
            </Label>
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>
        <ModelServingContextProvider namespace={namespace} getErrorComponent={renderError}>
          <DeployedModelsGallery
            showSuccessful={!filteredState || filteredState === FilterStates.success}
            showFailed={!filteredState || filteredState === FilterStates.failed}
          />
        </ModelServingContextProvider>
      </CardBody>
    </TypeBorderedCard>
  );
};

export default DeployedModelsCard;
