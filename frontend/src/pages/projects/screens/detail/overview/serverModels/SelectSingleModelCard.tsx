import * as React from 'react';
import { CardBody, CardFooter, Text, TextContent } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import ModelServingPlatformSelectButton from '~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';

type SelectSingleModelCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
};

const SelectSingleModelCard: React.FC<SelectSingleModelCardProps> = ({
  setErrorSelectingPlatform,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  return (
    <OverviewCard
      objectType={ProjectObjectType.modelServer}
      sectionType={SectionType.serving}
      title="Single-model serving platform"
      data-testid="single-serving-platform-card"
    >
      <CardBody>
        <TextContent>
          <Text component="small">
            Each model is deployed on its own model server. Choose this option when you want to
            deploy a large model such as a large language model (LLM).
          </Text>
        </TextContent>
      </CardBody>
      <CardFooter>
        <ModelServingPlatformSelectButton
          namespace={currentProject.metadata.name}
          servingPlatform={NamespaceApplicationCase.KSERVE_PROMOTION}
          setError={setErrorSelectingPlatform}
          variant="link"
          isInline
          data-testid="single-serving-select-button" // TODO this changed from model-serving-platform-button (which was duplicated), inform QE and look for other cases
        />
      </CardFooter>
    </OverviewCard>
  );
};

export default SelectSingleModelCard;
