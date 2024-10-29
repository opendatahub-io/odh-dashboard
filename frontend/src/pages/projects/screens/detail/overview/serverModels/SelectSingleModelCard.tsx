import * as React from 'react';
import { CardBody, CardFooter, Text, TextContent } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import { ServingRuntimePlatform } from '~/types';
import ModelServingPlatformSelectButton from '~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import AddModelFooter from './AddModelFooter';

type SelectSingleModelCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
  numServingPlatformsAvailable: number;
};

const SelectSingleModelCard: React.FC<SelectSingleModelCardProps> = ({
  setErrorSelectingPlatform,
  numServingPlatformsAvailable,
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
      {numServingPlatformsAvailable > 1 ? (
        <CardFooter>
          <ModelServingPlatformSelectButton
            namespace={currentProject.metadata.name}
            servingPlatform={NamespaceApplicationCase.KSERVE_PROMOTION}
            setError={setErrorSelectingPlatform}
            variant="link"
            isInline
            data-testid="single-serving-select-button"
          />
        </CardFooter>
      ) : (
        <AddModelFooter selectedPlatform={ServingRuntimePlatform.SINGLE} />
      )}
    </OverviewCard>
  );
};

export default SelectSingleModelCard;
