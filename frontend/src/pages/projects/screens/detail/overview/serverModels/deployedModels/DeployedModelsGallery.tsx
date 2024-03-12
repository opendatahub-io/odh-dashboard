import * as React from 'react';
import {
  Bullseye,
  Button,
  Flex,
  FlexItem,
  Gallery,
  Spinner,
  Text,
  TextContent,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ModelServingContext } from '~/pages/modelServing/ModelServingContext';
import { InferenceServiceKind } from '~/k8sTypes';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ProjectSectionID } from '~/pages/projects/screens/detail/types';
import DeployedModelCard from './DeployedModelCard';

interface DeployedModelsGalleryProps {
  showFailed: boolean;
  showSuccessful: boolean;
}

const DeployedModelsGallery: React.FC<DeployedModelsGalleryProps> = ({
  showSuccessful,
  showFailed,
}) => {
  const navigate = useNavigate();
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const {
    servingRuntimes: { data: servingRuntimes, loaded: servingRuntimesLoaded },
    inferenceServices: { data: inferenceServices, loaded: inferenceServicesLoaded },
  } = React.useContext(ModelServingContext);
  const [filteredServices, setFilteredServices] = React.useState<InferenceServiceKind[]>([]);
  const filteredStates = React.useRef<{ [key: string]: boolean | undefined }>({});

  const onStatus = (service: InferenceServiceKind, isMatch = false): void => {
    if (!service.metadata.uid || filteredStates.current[service.metadata.uid] === isMatch) {
      return;
    }
    filteredStates.current[service.metadata.uid] = isMatch;

    if (Object.keys(filteredStates.current).length === inferenceServices.length) {
      setFilteredServices(
        inferenceServices.filter((s) => s.metadata.uid && filteredStates.current[s.metadata.uid]),
      );
    }
  };

  const shownServices = filteredServices.slice(0, 5).map((s) => s.metadata.uid);

  return (
    <>
      <Gallery
        hasGutter
        minWidths={{ default: '285px' }}
        style={{ marginBottom: 'var(--pf-v5-global--spacer--sm)' }}
      >
        {!servingRuntimesLoaded ||
        !inferenceServicesLoaded ||
        Object.keys(filteredStates.current).length < inferenceServices.length ? (
          <>
            <Bullseye>
              <Spinner />
            </Bullseye>
          </>
        ) : null}
        {inferenceServices.map((model) => (
          <DeployedModelCard
            key={model.metadata.uid}
            inferenceService={model}
            servingRuntime={servingRuntimes.find(
              (sr) => sr.metadata.name === model.spec.predictor.model.runtime,
            )}
            onStatus={onStatus}
            showFailed={showFailed}
            showSuccessful={showSuccessful}
            display={shownServices.includes(model.metadata.uid)}
          />
        ))}
      </Gallery>
      <Flex gap={{ default: 'gapMd' }}>
        <FlexItem>
          <TextContent>
            <Text component="small">
              {shownServices.length} of {filteredServices.length} models
            </Text>
          </TextContent>
        </FlexItem>
        <FlexItem>
          <Button
            variant="link"
            onClick={() =>
              navigate(
                `/projects/${currentProject.metadata.name}?section=${ProjectSectionID.MODEL_SERVER}`,
              )
            }
          >
            View all
          </Button>
        </FlexItem>
      </Flex>
    </>
  );
};

export default DeployedModelsGallery;
