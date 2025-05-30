import * as React from 'react';
import { CardBody, CardFooter, Content } from '@patternfly/react-core';
import { ProjectObjectType, SectionType } from '#~/concepts/design/utils';
import OverviewCard from '#~/pages/projects/screens/detail/overview/components/OverviewCard';
import ModelServingPlatformSelectButton from '#~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { NamespaceApplicationCase } from '#~/pages/projects/types';

type SelectMultiModelCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
};

const SelectMultiModelCard: React.FC<SelectMultiModelCardProps> = ({
  setErrorSelectingPlatform,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  return (
    <OverviewCard
      objectType={ProjectObjectType.multiModel}
      sectionType={SectionType.serving}
      title="Multi-model serving platform"
      data-testid="multi-serving-platform-card"
    >
      <CardBody>
        <Content component="small">
          Multiple models can be deployed on one shared model server. Choose this option when you
          want to deploy a number of small or medium-sized models that can share the server
          resources.
        </Content>
      </CardBody>
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
    </OverviewCard>
  );
};

export default SelectMultiModelCard;
