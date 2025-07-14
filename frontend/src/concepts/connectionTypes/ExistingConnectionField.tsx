import React from 'react';
import { Flex, FlexItem, FormGroup, Label, Truncate } from '@patternfly/react-core';
import { LabeledConnection } from '#~/pages/modelServing/screens/types';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
} from '#~/concepts/k8s/utils';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import { ConnectionDetailsHelperText } from './ConnectionDetailsHelperText';
import { getConnectionTypeDisplayName, getConnectionTypeRef } from './utils';
import { Connection, ConnectionTypeConfigMapObj } from './types';

type ExistingConnectionFieldProps = {
  children: React.ReactNode;
  connectionTypes: ConnectionTypeConfigMapObj[];
  projectConnections: LabeledConnection[];
  selectedConnection?: Connection;
  onSelect: (connection: Connection) => void;

  labelHelp?: React.ReactElement;
};

export const ExistingConnectionField: React.FC<ExistingConnectionFieldProps> = ({
  children,
  connectionTypes,
  projectConnections,
  selectedConnection,
  onSelect,
  labelHelp,
}) => {
  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      projectConnections.map((connection) => {
        const { isRecommended } = connection;
        const displayName = getDisplayNameFromK8sResource(connection.connection);

        return {
          content: displayName,
          value: getResourceNameFromK8sResource(connection.connection),
          dropdownLabel: (
            <>
              {isRecommended && (
                <Label color="blue" isCompact>
                  Recommended
                </Label>
              )}
            </>
          ),
          description: (
            <Flex direction={{ default: 'column' }} rowGap={{ default: 'rowGapNone' }}>
              {getDescriptionFromK8sResource(connection.connection) && (
                <FlexItem>
                  <Truncate content={getDescriptionFromK8sResource(connection.connection)} />
                </FlexItem>
              )}
              <FlexItem>
                <Truncate
                  content={`Type: ${
                    getConnectionTypeDisplayName(connection.connection, connectionTypes) ||
                    'Unknown'
                  }`}
                />
              </FlexItem>
            </Flex>
          ),
          isSelected:
            !!selectedConnection &&
            getResourceNameFromK8sResource(connection.connection) ===
              getResourceNameFromK8sResource(selectedConnection),
        };
      }),
    [connectionTypes, projectConnections, selectedConnection],
  );

  const selectedConnectionType = React.useMemo(
    () =>
      connectionTypes.find(
        (t) => getResourceNameFromK8sResource(t) === getConnectionTypeRef(selectedConnection),
      ),
    [connectionTypes, selectedConnection],
  );

  return (
    <FormGroup label="Connection" isRequired className="pf-v6-u-mb-lg" labelHelp={labelHelp}>
      <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem grow={{ default: 'grow' }}>
          <TypeaheadSelect
            selectOptions={options}
            onSelect={(_, value) => {
              const newConnection = projectConnections.find(
                (c) => getResourceNameFromK8sResource(c.connection) === value,
              );
              if (newConnection) {
                onSelect(newConnection.connection);
              }
            }}
            popperProps={{ appendTo: 'inline' }}
            previewDescription={false}
          />
        </FlexItem>
        <FlexItem>
          <ConnectionDetailsHelperText
            connection={selectedConnection}
            connectionType={selectedConnectionType}
          />
        </FlexItem>
      </Flex>
      {children}
    </FormGroup>
  );
};
