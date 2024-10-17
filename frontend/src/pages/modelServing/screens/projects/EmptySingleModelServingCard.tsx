import * as React from 'react';
import {
  Bullseye,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Text,
  TextContent,
  TextVariants,
} from '@patternfly/react-core';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { NamespaceApplicationCase } from '~/pages/projects/types';
import ModelServingPlatformSelectButton from '~/pages/modelServing/screens/projects/ModelServingPlatformSelectButton';

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
        border: '1px solid var(--pf-v5-global--BorderColor--100)',
        borderRadius: 16,
      }}
      data-testid="single-serving-platform-card"
    >
      <CardTitle>
        <TextContent>
          <Text component={TextVariants.h2}>Single-model serving platform</Text>
        </TextContent>
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
            data-testid="single-serving-select-button" // TODO this changed from single-serving-deploy-button, inform QE and look for other cases
          />
        </Bullseye>
      </CardFooter>
    </Card>
  );
};

export default EmptySingleModelServingCard;
