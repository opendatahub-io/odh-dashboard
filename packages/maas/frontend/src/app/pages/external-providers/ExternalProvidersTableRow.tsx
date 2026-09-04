import * as React from 'react';
import { ResourceTr } from '@odh-dashboard/ui-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { ActionsColumn, Tbody, Td } from '@patternfly/react-table';
import { Button, Flex, FlexItem, Label } from '@patternfly/react-core';
import { PhaseResourceType } from '~/app/utilities/phaseLabelUtils';
import { ExternalProvider } from '~/app/types/external-models';
import PhaseLabel from '~/app/shared/Phase/PhaseLabel';
import { mapAuthMechanismToHumanReadable } from '~/app/pages/external-models/utils';
import PathModal from '~/app/pages/external-models/modals/ExternalModelsPathModal';
import { externalProvidersColumns } from './columns';
import { convertStringToProviderType, getExternalProviderResource } from './utils';

type ExternalProvidersTableRowProps = {
  externalProvider: ExternalProvider;
  setDeleteExternalProvider: (externalProvider: ExternalProvider) => void;
};

const ExternalProvidersTableRow: React.FC<ExternalProvidersTableRowProps> = ({
  externalProvider,
  setDeleteExternalProvider,
}) => {
  const [endpointURLModalRef, setEndpointURLModalRef] = React.useState<string | null>(null);

  const nameCell = (
    <Td dataLabel={externalProvidersColumns[0].label}>
      <TableRowTitleDescription
        data-testid="external-provider-name-cell"
        title={
          <span data-testid="external-provider-name">
            {externalProvider.displayName ?? externalProvider.name}
          </span>
        }
        description={externalProvider.description ?? ''}
        truncateDescriptionLines={2}
        resource={getExternalProviderResource(externalProvider)}
      />
    </Td>
  );

  const providerTypeCell = (
    <Td dataLabel={externalProvidersColumns[1].label} data-testid="external-provider-provider-type">
      <Label color="blue" variant="outline">
        {convertStringToProviderType(externalProvider.provider)}
      </Label>
    </Td>
  );

  const endpointCell = (
    <Td dataLabel={externalProvidersColumns[2].label} data-testid="external-provider-endpoint-url">
      <Button
        variant="link"
        isInline
        onClick={() => {
          setEndpointURLModalRef(externalProvider.endpointUrl);
        }}
        data-testid={`external-provider-view-endpoint-button-${externalProvider.name}`}
      >
        View
      </Button>
    </Td>
  );

  const authenticationCell = (
    <Td
      dataLabel={externalProvidersColumns[3].label}
      data-testid="external-provider-auth-mechanism"
    >
      <Label color="purple" variant="outline">
        {mapAuthMechanismToHumanReadable(externalProvider.authMechanism)}
      </Label>
    </Td>
  );

  const credentialSecretCell = (
    <Td
      dataLabel={externalProvidersColumns[4].label}
      data-testid="external-provider-credential-secret-ref"
    >
      {externalProvider.credentialSecretRef}
    </Td>
  );

  const phaseCell = (
    <Td dataLabel={externalProvidersColumns[5].label}>
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <PhaseLabel
            phase={externalProvider.phase}
            resourceType={PhaseResourceType.EXTERNAL_PROVIDER}
            resourceName={externalProvider.displayName ?? externalProvider.name}
            statusMessage={externalProvider.statusMessage}
            status={externalProvider.phase}
            conditionType={externalProvider.conditionType}
            lastTransitionTime={externalProvider.lastTransitionTime}
            reason={externalProvider.reason}
          />
        </FlexItem>
      </Flex>
    </Td>
  );

  const actionsCell = (
    <Td isActionCell>
      <ActionsColumn
        data-testid="external-provider-actions"
        items={[
          {
            title: 'Delete',
            onClick: () => setDeleteExternalProvider(externalProvider),
          },
        ]}
      />
    </Td>
  );

  return (
    <>
      <Tbody data-testid="external-provider-row">
        <ResourceTr resource={getExternalProviderResource(externalProvider)} isControlRow>
          {nameCell}
          {providerTypeCell}
          {endpointCell}
          {authenticationCell}
          {credentialSecretCell}
          {phaseCell}
          {actionsCell}
        </ResourceTr>
      </Tbody>
      <PathModal
        title="Endpoints"
        description="Use the following URL endpoint to connect this provider to your application."
        inputTitle="External API endpoint"
        path={externalProvider.endpointUrl}
        isOpen={!!endpointURLModalRef}
        onClose={() => {
          setEndpointURLModalRef(null);
        }}
        subContentTitle="Authentication"
        subContent={mapAuthMechanismToHumanReadable(externalProvider.authMechanism)}
      />
    </>
  );
};

export default ExternalProvidersTableRow;
