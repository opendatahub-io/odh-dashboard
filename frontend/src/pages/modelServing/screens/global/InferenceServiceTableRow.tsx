import * as React from 'react';
import { DropdownDirection, Icon } from '@patternfly/react-core';
import { InferenceServiceKind } from '../../../../k8sTypes';
import { ActionsColumn, Tbody, Td, Tr } from '@patternfly/react-table';
import ResourceNameTooltip from '../../../projects/components/ResourceNameTooltip';
import { getInferenceServiceDisplayName, getInferenceServiceActiveModelState } from './utils';
import InferenceServiceEndpoint from './InferenceServiceEndpoint';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  OutlinedQuestionCircleIcon,
  PendingIcon,
} from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import InferenceServiceProject from './InferenceServiceProject';
import { InferenceServiceModelState } from '../types';

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
  const renderAlert = () => {
    switch (getInferenceServiceActiveModelState(inferenceService)) {
      case InferenceServiceModelState.LOADED:
      case InferenceServiceModelState.STANDBY:
        return (
          <Icon status="success">
            <CheckCircleIcon />
          </Icon>
        );
      case InferenceServiceModelState.FAILED_TO_LOAD:
        return (
          <Icon status="danger">
            <ExclamationCircleIcon />
          </Icon>
        );
      case InferenceServiceModelState.PENDING:
      case InferenceServiceModelState.LOADING:
        return (
          <Icon>
            <PendingIcon />
          </Icon>
        );
      case InferenceServiceModelState.UNKNOWN:
        return (
          <Icon status="warning">
            <OutlinedQuestionCircleIcon />
          </Icon>
        );
      default:
        return (
          <Icon status="warning">
            <OutlinedQuestionCircleIcon />
          </Icon>
        );
    }
  };

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
        <Td dataLabel="Status">{renderAlert()}</Td>
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
