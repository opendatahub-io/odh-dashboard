import * as React from 'react';
import { CardBody, CardFooter, Content } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import OverviewCard from '#~/pages/projects/screens/detail/overview/components/OverviewCard';
import ModelServingPlatformSelectButton from '#~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { NamespaceApplicationCase } from '#~/pages/projects/types';

type SelectNIMCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
};

const SelectNIMCard: React.FC<SelectNIMCardProps> = ({ setErrorSelectingPlatform }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  return (
    <OverviewCard
      objectType={ProjectObjectType.modelServer}
      sectionType={SectionType.serving}
      title="NVIDIA NIM model serving platform"
      data-testid="nvidia-nim-platform-card"
    >
      <CardBody>
        <Content component="small">
          Models are deployed using NVIDIA NIM microservices. Choose this option when you want to
          deploy your model within a NIM container. Please provide the API key to authenticate with
          the NIM service.
        </Content>
      </CardBody>
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
    </OverviewCard>
  );
};

export default SelectNIMCard;
