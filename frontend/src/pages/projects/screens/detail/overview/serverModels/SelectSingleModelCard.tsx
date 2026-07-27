import * as React from 'react';
import { CardBody, CardFooter, Content } from '@patternfly/react-core';
import OverviewCard from '@odh-dashboard/ui-core/components/detail/OverviewCard';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import ModelServingPlatformSelectButton from '#~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { NamespaceApplicationCase } from '#~/pages/projects/types';

type SelectSingleModelCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
};

const SelectSingleModelCard: React.FC<SelectSingleModelCardProps> = ({
  setErrorSelectingPlatform,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  return (
    <OverviewCard
      objectType={ProjectObjectType.singleModel}
      sectionType={SectionType.serving}
      title="Single-model serving platform"
      data-testid="kserve-platform-card"
    >
      <CardBody>
        <Content component="small">
          Each model is deployed on its own model server. Choose this option when you want to deploy
          a large model such as a large language model (LLM).
        </Content>
      </CardBody>
      <CardFooter>
        <ModelServingPlatformSelectButton
          namespace={currentProject.metadata.name}
          servingPlatform={NamespaceApplicationCase.KSERVE_PROMOTION}
          setError={setErrorSelectingPlatform}
          variant="link"
          isInline
          data-testid="kserve-select-button"
        />
      </CardFooter>
    </OverviewCard>
  );
};

export default SelectSingleModelCard;
