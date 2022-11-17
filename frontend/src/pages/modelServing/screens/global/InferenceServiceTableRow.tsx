import * as React from 'react';
import { DropdownDirection, Icon } from '@patternfly/react-core';
import { InferenceServiceKind } from '../../../../k8sTypes';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import ResourceNameTooltip from '../../../projects/components/ResourceNameTooltip';
import { checkInferenceServiceReady, getInferenceServiceDisplayName } from './utils';
import InferenceServiceEndpoint from './InferenceServiceEndpoint';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import InferenceServiceProject from './InferenceServiceProject';

type InferenceServiceTableRowProps = {
  obj: InferenceServiceKind;
  isGlobal: boolean;
  onDeleteInferenceService: (obj: InferenceServiceKind) => void;
  onEditInferenceService: (obj: InferenceServiceKind) => void;
};

const InferenceServiceTableRow: React.FC<InferenceServiceTableRowProps> = ({
  obj: inferenceService,
  onDeleteInferenceService,
  onEditInferenceService,
  isGlobal,
}) => {
  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Name">
          <ResourceNameTooltip resource={inferenceService}>
            <Link to="/modelServing">{getInferenceServiceDisplayName(inferenceService)}</Link>
          </ResourceNameTooltip>
        </Td>
        {isGlobal && (
          <Td dataLabel="Project">
            <InferenceServiceProject inferenceService={inferenceService} />
          </Td>
        )}
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
            dropdownDirection={isGlobal ? DropdownDirection.down : DropdownDirection.up}
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
    </Tbody>
  );
};

export default InferenceServiceTableRow;
