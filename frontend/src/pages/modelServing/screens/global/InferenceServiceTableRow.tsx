import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
import useModelMetricsEnabled from '~/pages/modelServing/useModelMetricsEnabled';
import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import { getInferenceServiceDisplayName } from './utils';
import InferenceServiceEndpoint from './InferenceServiceEndpoint';
import InferenceServiceProject from './InferenceServiceProject';
import InferenceServiceModel from './InferenceServiceModel';
import InferenceServiceStatus from './InferenceServiceStatus';

type InferenceServiceTableRowProps = {
  obj: InferenceServiceKind;
  isGlobal: boolean;
  servingRuntime?: ServingRuntimeKind;
  onDeleteInferenceService: (obj: InferenceServiceKind) => void;
  onEditInferenceService: (obj: InferenceServiceKind) => void;
};

const InferenceServiceTableRow: React.FC<InferenceServiceTableRowProps> = ({
  obj: inferenceService,
  servingRuntime,
  onDeleteInferenceService,
  onEditInferenceService,
  isGlobal,
}) => {
  const [modelMetricsEnabled] = useModelMetricsEnabled();

  return (
    <Tr>
      <Td dataLabel="Name">
        <ResourceNameTooltip resource={inferenceService}>
          {modelMetricsEnabled ? (
            <Link
              to={
                isGlobal
                  ? `/modelServing/metrics/${inferenceService.metadata.namespace}/${inferenceService.metadata.name}`
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
      {isGlobal && (
        <Td dataLabel="Model server">
          <InferenceServiceModel inferenceService={inferenceService} />
        </Td>
      )}
      <Td dataLabel="Inference endpoint">
        <InferenceServiceEndpoint
          inferenceService={inferenceService}
          servingRuntime={servingRuntime}
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
    </Tr>
  );
};

export default InferenceServiceTableRow;
