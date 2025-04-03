import React from 'react';
import { TypeaheadSelectOption } from '@patternfly/react-templates';
import { Flex, FlexItem, FormGroup, Label, Popover, Truncate } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { LabeledConnection } from '~/pages/modelServing/screens/types';
import TypeaheadSelect from '~/components/TypeaheadSelect';
import {
  getDescriptionFromK8sResource,
  getDisplayNameFromK8sResource,
  getResourceNameFromK8sResource,
} from '~/concepts/k8s/utils';
import DashboardPopupIconButton from '~/concepts/dashboard/DashboardPopupIconButton';
import { getConnectionTypeDisplayName, getConnectionTypeRef } from './utils';
import { Connection, ConnectionTypeConfigMapObj } from './types';
import { ConnectionDetailsHelperText } from './ConnectionDetailsHelperText';

type ExistingConnectionFieldProps = {
  connectionTypes: ConnectionTypeConfigMapObj[];
  projectConnections: LabeledConnection[];
  selectedConnection?: Connection;
  onSelect: (connection: Connection) => void;
  setIsConnectionValid: (isValid: boolean) => void;
};

export const ExistingConnectionField: React.FC<ExistingConnectionFieldProps> = ({
  connectionTypes,
  projectConnections,
  selectedConnection,
  onSelect,
  setIsConnectionValid,
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

  // React.useEffect(() => {
  //   setIsConnectionValid(!!selectedConnection);
  // }, [selectedConnection, setIsConnectionValid]);

  return (
    <>
      <FormGroup
        label="Connection"
        isRequired
        className="pf-v6-u-mb-lg"
        labelHelp={
          <Popover
            aria-label="Hoverable popover"
            bodyContent="This list includes only connections that are compatible with model serving."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
            />
          </Popover>
        }
      >
        <Flex direction={{ default: 'row' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem grow={{ default: 'grow' }}>
            <TypeaheadSelect
              selectOptions={options}
              onSelect={(_, value) => {
                // console.log('value', value);
                const newConnection = projectConnections.find(
                  (c) => getResourceNameFromK8sResource(c.connection) === value,
                );
                // console.log('newConnection', newConnection);
                if (newConnection) {
                  onSelect(newConnection.connection);
                }
                setIsConnectionValid(!!selectedConnection);
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
      </FormGroup>
    </>
  );
};
