import * as React from 'react';
import { CardBody, CardFooter, Text, TextContent } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import { ServingRuntimePlatform } from '~/types';
import ModelServingPlatformSelectButton from '~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import AddModelFooter from './AddModelFooter';

type SelectMultiModelCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
  numServingPlatformsAvailable: number;
};

const SelectMultiModelCard: React.FC<SelectMultiModelCardProps> = ({
  setErrorSelectingPlatform,
  numServingPlatformsAvailable,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  return (
    <OverviewCard
      objectType={ProjectObjectType.modelServer}
      sectionType={SectionType.serving}
      title="Multi-model serving platform"
      data-testid="multi-serving-platform-card"
    >
      <CardBody>
        <TextContent>
          <Text component="small">
            Multiple models can be deployed on one shared model server. Choose this option when you
            want to deploy a number of small or medium-sized models that can share the server
            resources.
          </Text>
        </TextContent>
      </CardBody>
      {numServingPlatformsAvailable > 1 ? (
        <CardFooter>
          <ModelServingPlatformSelectButton
            namespace={currentProject.metadata.name}
            servingPlatform={NamespaceApplicationCase.MODEL_MESH_PROMOTION}
            setError={setErrorSelectingPlatform}
            variant="link"
            isInline
            data-testid="multi-serving-select-button"
          />
        </CardFooter>
      ) : (
        <AddModelFooter selectedPlatform={ServingRuntimePlatform.MULTI} />
      )}
    </OverviewCard>
  );
};

export default SelectMultiModelCard;
