import * as React from 'react';
import {
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  FlexItem,
  GalleryItem,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import InferenceServiceStatus from '#~/pages/modelServing/screens/global/InferenceServiceStatus';
import ResourceNameTooltip from '#~/components/ResourceNameTooltip';
import InferenceServiceServingRuntime from '#~/pages/modelServing/screens/global/InferenceServiceServingRuntime';
import InferenceServiceEndpoint from '#~/pages/modelServing/screens/global/InferenceServiceEndpoint';
import TypeBorderedCard from '#~/concepts/design/TypeBorderedCard';
import { useInferenceServiceStatus } from '#~/pages/modelServing/useInferenceServiceStatus.ts';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable.ts';
import { SupportedArea } from '#~/concepts/areas/types.ts';
import useModelMetricsEnabled from '#~/pages/modelServing/useModelMetricsEnabled.ts';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils.ts';

interface DeployedModelCardProps {
  inferenceService: InferenceServiceKind;
  servingRuntime?: ServingRuntimeKind;
}
const DeployedModelCard: React.FC<DeployedModelCardProps> = ({
  inferenceService,
  servingRuntime,
}) => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  // Always KServe (no ModelMesh)
  const kserveMetricsEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;
  const kserveMetricsSupported = modelMetricsEnabled && kserveMetricsEnabled;

  const displayName = getDisplayNameFromK8sResource(inferenceService);

  const { isStarting, isStopping, isStopped, isRunning, isFailed } =
    useInferenceServiceStatus(inferenceService);

  return (
    <GalleryItem key={inferenceService.metadata.uid}>
      <TypeBorderedCard isFullHeight objectType={ProjectObjectType.modelServer}>
        <CardHeader>
          <Flex gap={{ default: 'gapSm' }} direction={{ default: 'column' }}>
            <FlexItem>
              <InferenceServiceStatus
                inferenceService={inferenceService}
                isKserve={true} // Always KServe
                stoppedStates={{
                  isStarting,
                  isStopping,
                  isStopped,
                  isRunning,
                }}
              />
            </FlexItem>
            <FlexItem>
              <ResourceNameTooltip resource={inferenceService}>
                {!isStarting && !isFailed && kserveMetricsSupported ? (
                  <Link
                    data-testid={`metrics-link-${displayName}`}
                    to={`/projects/${inferenceService.metadata.namespace}/metrics/model/${inferenceService.metadata.name}`}
                  >
                    {displayName}
                  </Link>
                ) : (
                  displayName
                )}
              </ResourceNameTooltip>
            </FlexItem>
          </Flex>
        </CardHeader>
        <CardBody>
          <Content>
            <Content component={ContentVariants.dl} style={{ display: 'block' }}>
              <Content
                component={ContentVariants.dt}
                style={{ marginBottom: 'var(--pf-t--global--spacer--xs)' }}
              >
                Serving runtime
              </Content>
              <Content
                component={ContentVariants.dd}
                style={{
                  fontSize: 'var(--pf-t--global--font--size--body--sm)',
                  color: !servingRuntime ? 'var(--pf-t--global--text--color--subtle)' : undefined,
                }}
              >
                <InferenceServiceServingRuntime servingRuntime={servingRuntime} />
              </Content>
            </Content>
          </Content>
        </CardBody>
        <CardFooter>
          <InferenceServiceEndpoint
            inferenceService={inferenceService}
            servingRuntime={servingRuntime}
            isKserve={true} // Always KServe
            modelState={{ isStarting, isStopping, isStopped, isRunning, isFailed }}
          />
        </CardFooter>
      </TypeBorderedCard>
    </GalleryItem>
  );
};

export default DeployedModelCard;
