import * as React from 'react';
import {
  Button,
  CardBody,
  CardFooter,
  CardHeader,
  Flex,
  FlexItem,
  GalleryItem,
  Truncate,
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ProjectObjectType } from '#~/concepts/design/utils';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import InferenceServiceStatus from '#~/pages/modelServing/screens/global/InferenceServiceStatus';
import { isModelMesh } from '#~/pages/modelServing/utils';
import ResourceNameTooltip from '#~/components/ResourceNameTooltip';
import useModelMetricsEnabled from '#~/pages/modelServing/useModelMetricsEnabled';
import InferenceServiceServingRuntime from '#~/pages/modelServing/screens/global/InferenceServiceServingRuntime';
import InferenceServiceEndpoint from '#~/pages/modelServing/screens/global/InferenceServiceEndpoint';
import TypeBorderedCard from '#~/concepts/design/TypeBorderedCard';
import { getDisplayNameFromK8sResource } from '#~/concepts/k8s/utils';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { useModelStatus } from '#~/pages/modelServing/useModelStatus.ts';

interface DeployedModelCardProps {
  inferenceService: InferenceServiceKind;
  servingRuntime?: ServingRuntimeKind;
}
const DeployedModelCard: React.FC<DeployedModelCardProps> = ({
  inferenceService,
  servingRuntime,
}) => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();
  const navigate = useNavigate();
  const kserveMetricsEnabled = useIsAreaAvailable(SupportedArea.K_SERVE_METRICS).status;
  const modelMesh = isModelMesh(inferenceService);
  const modelMetricsSupported = modelMetricsEnabled && (modelMesh || kserveMetricsEnabled);

  const { isStarting, isStopping, isStopped } = useModelStatus(inferenceService);
  const isNewlyDeployed = !inferenceService.status?.modelStatus?.states?.activeModelState;

  const inferenceServiceDisplayName = getDisplayNameFromK8sResource(inferenceService);

  return (
    <GalleryItem key={inferenceService.metadata.uid}>
      <TypeBorderedCard isFullHeight objectType={ProjectObjectType.modelServer}>
        <CardHeader>
          <Flex gap={{ default: 'gapSm' }} direction={{ default: 'column' }}>
            <FlexItem>
              <InferenceServiceStatus
                inferenceService={inferenceService}
                isKserve={!isModelMesh(inferenceService)}
                isStarting={isStarting || isNewlyDeployed}
                isStopping={isStopping}
                isStopped={isStopped && !isStopping}
              />
            </FlexItem>
            <FlexItem>
              <ResourceNameTooltip resource={inferenceService}>
                {modelMetricsSupported ? (
                  <Button
                    variant="link"
                    isInline
                    onClick={() => {
                      navigate(
                        `/projects/${inferenceService.metadata.namespace}/metrics/model/${inferenceService.metadata.name}`,
                      );
                    }}
                  >
                    <Truncate content={inferenceServiceDisplayName} />
                  </Button>
                ) : (
                  inferenceServiceDisplayName
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
            isKserve={!isModelMesh(inferenceService)}
          />
        </CardFooter>
      </TypeBorderedCard>
    </GalleryItem>
  );
};

export default DeployedModelCard;
