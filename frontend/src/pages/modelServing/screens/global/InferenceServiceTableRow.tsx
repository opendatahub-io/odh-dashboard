import * as React from 'react';
import { Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import ResourceActionsColumn from '~/components/ResourceActionsColumn';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import useModelMetricsEnabled from '~/pages/modelServing/useModelMetricsEnabled';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { isModelMesh } from '~/pages/modelServing/utils';
import { getInferenceServiceDisplayName } from './utils';
import InferenceServiceEndpoint from './InferenceServiceEndpoint';
import InferenceServiceProject from './InferenceServiceProject';
import InferenceServiceStatus from './InferenceServiceStatus';
import InferenceServiceServingRuntime from './InferenceServiceServingRuntime';
import InferenceServiceAPIProtocol from './InferenceServiceAPIProtocol';

type InferenceServiceTableRowProps = {
  obj: InferenceServiceKind;
  isGlobal: boolean;
  servingRuntime?: ServingRuntimeKind;
  onDeleteInferenceService: (obj: InferenceServiceKind) => void;
  onEditInferenceService: (obj: InferenceServiceKind) => void;
  showServingRuntime?: boolean;
};

const InferenceServiceTableRow: React.FC<InferenceServiceTableRowProps> = ({
  obj: inferenceService,
  servingRuntime,
  onDeleteInferenceService,
  onEditInferenceService,
  isGlobal,
  showServingRuntime,
}) => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  const modelMetricsSupported = (modelMetricsInferenceService: InferenceServiceKind) =>
    modelMetricsEnabled &&
    modelMetricsInferenceService.metadata.annotations?.['serving.kserve.io/deploymentMode'] ===
      'ModelMesh';

  return (
    <>
      <Td dataLabel="Name">
        <ResourceNameTooltip resource={inferenceService}>
          {modelMetricsSupported(inferenceService) ? (
            <Link
              to={
                isGlobal
                  ? `/modelServing/${inferenceService.metadata.namespace}/metrics/${inferenceService.metadata.name}`
                  : `/projects/${inferenceService.metadata.namespace}/metrics/model/${inferenceService.metadata.name}`
              }
            >
              {getInferenceServiceDisplayName(inferenceService)}
            </Link>
          ) : (
            getInferenceServiceDisplayName(inferenceService)
          )}
        </ResourceNameTooltip>
      </Td>
      {isGlobal && (
        <Td dataLabel="Project">
          <InferenceServiceProject inferenceService={inferenceService} />
        </Td>
      )}
      {showServingRuntime && (
        <Td dataLabel="Serving Runtime">
          <InferenceServiceServingRuntime servingRuntime={servingRuntime} />
        </Td>
      )}
      <Td dataLabel="Inference endpoint">
        <InferenceServiceEndpoint
          inferenceService={inferenceService}
          servingRuntime={servingRuntime}
          isKserve={!isModelMesh(inferenceService)}
        />
      </Td>
      <Td dataLabel="API protocol">
        <InferenceServiceAPIProtocol
          servingRuntime={servingRuntime}
          isMultiModel={modelMetricsSupported(inferenceService)}
        />
      </Td>
      <Td dataLabel="Status">
        <InferenceServiceStatus
          inferenceService={inferenceService}
          isKserve={!isModelMesh(inferenceService)}
        />
      </Td>
      <Td isActionCell>
        <ResourceActionsColumn
          resource={inferenceService}
          items={[
            {
              title: 'Edit',
              onClick: () => {
                onEditInferenceService(inferenceService);
              },
            },
            {
              title: 'Delete',
              onClick: () => {
                onDeleteInferenceService(inferenceService);
              },
            },
          ]}
        />
      </Td>
    </>
  );
};

export default InferenceServiceTableRow;
