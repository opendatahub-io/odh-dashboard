import * as React from 'react';
import { Icon } from '@patternfly/react-core';
import { InferenceServiceKind } from '../../../../k8sTypes';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import ResourceNameTooltip from '../../../projects/components/ResourceNameTooltip';
import { checkInferenceServiceReady, getInferenceServiceDisplayName } from './utils';
import InferenceServiceEndpoint from './InferenceServiceEndpoint';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';

type InferenceServiceTableRowProps = {
  obj: InferenceServiceKind;
};

const InferenceServiceTableRow: React.FC<InferenceServiceTableRowProps> = ({
  obj: inferenceService,
}) => {
  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Name">
          <ResourceNameTooltip resource={inferenceService}>
            <Link to="/modelServing">{getInferenceServiceDisplayName(inferenceService)}</Link>
          </ResourceNameTooltip>
        </Td>
        <Td dataLabel="Project">{inferenceService.metadata.namespace}</Td>
        <Td dataLabel="Inference endpoint">
          <InferenceServiceEndpoint inferenceService={inferenceService} />
        </Td>
        <Td dataLabel="Status">
          {checkInferenceServiceReady(inferenceService) ? (
            <Icon status="success">
              <CheckCircleIcon />
            </Icon>
          ) : (
            <Icon status="danger">
              <ExclamationCircleIcon />
            </Icon>
          )}
        </Td>
        <Td isActionCell>
          <ActionsColumn
            items={[
              {
                title: 'Edit',
                onClick: () => {
                  alert('Not implemented');
                },
              },
              {
                title: 'Delete',
                onClick: () => {
                  alert('Not implemented');
                },
              },
            ]}
          />
        </Td>
      </Tr>
    </Tbody>
  );
};

export default InferenceServiceTableRow;
