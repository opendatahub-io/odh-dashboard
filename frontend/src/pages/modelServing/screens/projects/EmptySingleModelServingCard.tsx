import * as React from 'react';
import {
  Bullseye,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import ModelServingPlatformSelectButton from '#~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';
import { NamespaceApplicationCase } from '#~/pages/projects/types';

type EmptySingleModelServingCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
};

const EmptySingleModelServingCard: React.FC<EmptySingleModelServingCardProps> = ({
  setErrorSelectingPlatform,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  return (
    <Card
      style={{
        height: '100%',
        border: '1px solid var(--pf-t--global--border--color--default)',
        borderRadius: 16,
      }}
      data-testid="single-serving-platform-card"
    >
      <CardTitle>
        <Content component={ContentVariants.h2}>Single-model serving platform</Content>
      </CardTitle>
      <CardBody>
        Each model is deployed on its own model server. Choose this option when you want to deploy a
        large model such as a large language model (LLM).
      </CardBody>
      <CardFooter>
        <Bullseye>
          <ModelServingPlatformSelectButton
            namespace={currentProject.metadata.name}
            servingPlatform={NamespaceApplicationCase.KSERVE_PROMOTION}
            setError={setErrorSelectingPlatform}
            variant="secondary"
            data-testid="single-serving-select-button"
          />
        </Bullseye>
      </CardFooter>
    </Card>
  );
};

export default EmptySingleModelServingCard;
