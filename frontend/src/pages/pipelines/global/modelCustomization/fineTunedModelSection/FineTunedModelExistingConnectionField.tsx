import React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  Popover,
  Truncate,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import TypeaheadSelect, { TypeaheadSelectOption } from '~/components/TypeaheadSelect';
import { Connection, ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
} from '~/concepts/k8s/utils';
import {
  getConnectionTypeDisplayName,
  getConnectionTypeRef,
} from '~/concepts/connectionTypes/utils';
import { ConnectionDetailsHelperText } from '~/concepts/connectionTypes/ConnectionDetailsHelperText';

type FineTunedModelExistingConnectionFieldProps = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  connections: Connection[];
  selectedConnection?: Connection;
  onSelect: (connection: Connection) => void;
};

const FineTunedModelExistingConnectionField: React.FC<
  FineTunedModelExistingConnectionFieldProps
> = ({ connectionTypes, connections, selectedConnection, onSelect }) => {
  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      connections.map((connection) => {
        const displayName = getDisplayNameFromK8sResource(connection);

        return {
          content: displayName,
          value: getResourceNameFromK8sResource(connection),
          description: (
            <Flex direction={{ default: 'column' }} rowGap={{ default: 'rowGapNone' }}>
              {getDescriptionFromK8sResource(connection) && (
                <FlexItem>
                  <Truncate content={getDescriptionFromK8sResource(connection)} />
                </FlexItem>
              )}
              <FlexItem>
                <Truncate
                  content={`Type: ${
                    getConnectionTypeDisplayName(connection, connectionTypes) || 'Unknown'
                  }`}
                />
              </FlexItem>
            </Flex>
          ),
          isSelected:
            !!selectedConnection &&
            getResourceNameFromK8sResource(connection) ===
              getResourceNameFromK8sResource(selectedConnection),
        };
      }),
    [connectionTypes, connections, selectedConnection],
  );

  const selectedConnectionType = React.useMemo(
    () =>
      connectionTypes.find(
        (t) => getResourceNameFromK8sResource(t) === getConnectionTypeRef(selectedConnection),
      ),
    [connectionTypes, selectedConnection],
  );

  return (
    <>
      <Popover
        aria-label="Hoverable popover"
        bodyContent="This list includes only connections that are OCI compatible."
      >
        <Button
          style={{ paddingLeft: 0 }}
          icon={<OutlinedQuestionCircleIcon />}
          variant="link"
          disabled
        >
          Not seeing what you&apos;re looking for?
        </Button>
      </Popover>
      <FormGroup label="Connection" className="pf-v6-u-mb-lg">
        <TypeaheadSelect
          selectOptions={options}
          onSelect={(_, value) => {
            const newConnection = connections.find(
              (c) => getResourceNameFromK8sResource(c) === value,
            );
            if (newConnection) {
              onSelect(newConnection);
            }
          }}
          popperProps={{ appendTo: 'inline' }}
          previewDescription={false}
          placeholder={options.length === 0 ? 'No connections available' : 'Select a connection'}
        />
        {selectedConnection && (
          <FormHelperText>
            <ConnectionDetailsHelperText
              connection={selectedConnection}
              connectionType={selectedConnectionType}
            />
          </FormHelperText>
        )}
      </FormGroup>
    </>
  );
};

export default FineTunedModelExistingConnectionField;
