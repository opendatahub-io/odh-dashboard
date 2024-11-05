import * as React from 'react';
import { CardBody, CardFooter, Text, TextContent } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import ModelServingPlatformSelectButton from '~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';

type SelectMultiModelCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
};

const SelectMultiModelCard: React.FC<SelectMultiModelCardProps> = ({
  setErrorSelectingPlatform,
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
      <CardFooter>
        <ModelServingPlatformSelectButton
          namespace={currentProject.metadata.name}
          servingPlatform={NamespaceApplicationCase.MODEL_MESH_PROMOTION}
          setError={setErrorSelectingPlatform}
          variant="link"
          isInline
          data-testid="multi-serving-select-button" // TODO this changed from model-serving-platform-button (which was duplicated), inform QE and look for other cases
        />
      </CardFooter>
    </OverviewCard>
  );
};

export default SelectMultiModelCard;
