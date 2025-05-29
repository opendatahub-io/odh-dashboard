import * as React from 'react';
import {
  CardBody,
  CardHeader,
  Content,
  Flex,
  FlexItem,
  Label,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import HeaderIcon from '#~/concepts/design/HeaderIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import TypeBorderedCard from '#~/concepts/design/TypeBorderedCard';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { isProjectNIMSupported } from '#~/pages/modelServing/screens/projects/nimUtils';
import DeployedModelsGallery from './DeployedModelsGallery';

enum FilterStates {
  success = 'success',
  failed = 'failed',
}

interface DeployedModelsCardProps {
  deployedModels: InferenceServiceKind[];
  servingRuntimes: ServingRuntimeKind[];
  isMultiPlatform: boolean;
}

const DeployedModelsCard: React.FC<DeployedModelsCardProps> = ({
  deployedModels,
  servingRuntimes,
  isMultiPlatform,
}) => {
  const [filteredState, setFilteredState] = React.useState<FilterStates | undefined>();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const isKServeNIMEnabled = isProjectNIMSupported(currentProject);

  return (
    <TypeBorderedCard objectType={ProjectObjectType.deployedModels}>
      <CardHeader>
        <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <HeaderIcon type={ProjectObjectType.deployedModels} />
          <FlexItem>
            <Content>
              <Content component="h3">
                <b>Deployed models</b>
              </Content>
            </Content>
          </FlexItem>
          <FlexItem>
            <ToggleGroup
              style={{ marginLeft: 'var(--pf-t--global--spacer--md)' }}
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
              {isKServeNIMEnabled
                ? 'NVIDIA NIM serving enabled'
                : isMultiPlatform
                ? 'Multi-model serving enabled'
                : 'Single-model serving enabled'}
            </Label>
          </FlexItem>
        </Flex>
      </CardHeader>
      <CardBody>
        <DeployedModelsGallery
          deployedModels={deployedModels}
          servingRuntimes={servingRuntimes}
          showSuccessful={!filteredState || filteredState === FilterStates.success}
          showFailed={!filteredState || filteredState === FilterStates.failed}
          onClearFilters={() => setFilteredState(undefined)}
        />
      </CardBody>
    </TypeBorderedCard>
  );
};

export default DeployedModelsCard;
