import * as React from 'react';
import { CardBody, CardFooter, Text, TextContent } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '~/concepts/design/utils';
import OverviewCard from '~/pages/projects/screens/detail/overview/components/OverviewCard';
import { ServingRuntimePlatform } from '~/types';
import ModelServingPlatformSelectButton from '~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import AddModelFooter from './AddModelFooter';

type SelectNIMCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
  numServingPlatformsAvailable: number;
};

const SelectNIMCard: React.FC<SelectNIMCardProps> = ({
  setErrorSelectingPlatform,
  numServingPlatformsAvailable,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  return (
    <OverviewCard
      objectType={ProjectObjectType.modelServer}
      sectionType={SectionType.serving}
      title="NVIDIA NIM model serving platform"
      data-testid="nvidia-nim-platform-card"
    >
      <CardBody>
        <TextContent>
          <Text component="small">
            Models are deployed using NVIDIA NIM microservices. Choose this option when you want to
            deploy your model within a NIM container. Please provide the API key to authenticate
            with the NIM service.
          </Text>
        </TextContent>
      </CardBody>
      {numServingPlatformsAvailable > 1 ? (
        <CardFooter>
          <ModelServingPlatformSelectButton
            namespace={currentProject.metadata.name}
            servingPlatform={NamespaceApplicationCase.KSERVE_NIM_PROMOTION}
            setError={setErrorSelectingPlatform}
            variant="link"
            isInline
            data-testid="nim-serving-select-button"
          />
        </CardFooter>
      ) : (
        <AddModelFooter selectedPlatform={ServingRuntimePlatform.SINGLE} isNIM />
      )}
    </OverviewCard>
  );
};

export default SelectNIMCard;
