import * as React from 'react';
import { ActionsColumn, Td } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import useModelMetricsEnabled from '~/pages/modelServing/useModelMetricsEnabled';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { isModelMesh } from '~/pages/modelServing/utils';
import { getInferenceServiceDisplayName } from './utils';
import InferenceServiceEndpoint from './InferenceServiceEndpoint';
import InferenceServiceProject from './InferenceServiceProject';
import InferenceServiceStatus from './InferenceServiceStatus';
import InferenceServiceServingRuntime from './InferenceServiceServingRuntime';

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

  return (
    <>
      <Td dataLabel="Name">
        <ResourceNameTooltip resource={inferenceService}>
          {modelMetricsEnabled ? (
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
      <Td dataLabel="Status">
        <InferenceServiceStatus inferenceService={inferenceService} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
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
