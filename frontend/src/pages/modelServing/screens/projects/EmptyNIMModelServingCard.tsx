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

type EmptyNIMModelServingCardProps = {
  setErrorSelectingPlatform: (e?: Error) => void;
};

const EmptyNIMModelServingCard: React.FC<EmptyNIMModelServingCardProps> = ({
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
      data-testid="nvidia-nim-model-serving-platform-card"
    >
      <CardTitle>
        <TextContent>
          <Text component={TextVariants.h2}>NVIDIA NIM model serving platform</Text>
        </TextContent>
      </CardTitle>
      <CardBody>
        Models are deployed using NVIDIA NIM microservices. Choose this option when you want to
        deploy your model within a NIM container. Please provide the API key to authenticate with
        the NIM service.
      </CardBody>
      <CardFooter>
        <Bullseye>
          <ModelServingPlatformSelectButton
            namespace={currentProject.metadata.name}
            servingPlatform={NamespaceApplicationCase.KSERVE_NIM_PROMOTION}
            setError={setErrorSelectingPlatform}
            variant="secondary"
            data-testid="nim-serving-select-button" // TODO this changed from nim-serving-deploy-button, inform QE and look for other cases
          />
        </Bullseye>
      </CardFooter>
    </Card>
  );
};

export default EmptyNIMModelServingCard;
