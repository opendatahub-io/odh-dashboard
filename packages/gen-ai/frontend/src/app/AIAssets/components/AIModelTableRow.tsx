import * as React from 'react';
import { Button, Truncate, Label } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { CheckCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { TableRowTitleDescription } from 'mod-arch-shared';
import { AIModel } from '~/app/AIAssets/types';

type AIModelTableRowProps = {
  model: AIModel;
  onViewInternalEndpoint: (model: AIModel) => void;
  onCreateExternalEndpoint: (model: AIModel) => void;
  onViewExternalEndpoint: (model: AIModel) => void;
  onAddToPlayground: (model: AIModel) => void;
  onTryInPlayground: (model: AIModel) => void;
};

const AIModelTableRow: React.FC<AIModelTableRowProps> = ({
  model,
  onViewInternalEndpoint,
  onCreateExternalEndpoint,
  onViewExternalEndpoint,
  onAddToPlayground,
  onTryInPlayground,
}) => (
  <Tr>
    <Td dataLabel="Model deployment name">
      <TableRowTitleDescription title={model.name} description={model.description} />
    </Td>
    <Td dataLabel="Status">
      <Label color="green" icon={<CheckCircleIcon />}>
        Active
      </Label>
    </Td>
    <Td dataLabel="Internal endpoint">
      {model.internalEndpoint ? (
        <Button variant="link" onClick={() => onViewInternalEndpoint(model)} style={{ padding: 0 }}>
          View
        </Button>
      ) : (
        <span style={{ color: 'var(--pf-t--global--Color--200)' }}>—</span>
      )}
    </Td>
    <Td dataLabel="External endpoint">
      {model.externalEndpoint ? (
        <Button variant="link" onClick={() => onViewExternalEndpoint(model)} style={{ padding: 0 }}>
          View
        </Button>
      ) : (
        <Button
          variant="link"
          onClick={() => onCreateExternalEndpoint(model)}
          style={{ padding: 0 }}
        >
          + Create
        </Button>
      )}
    </Td>
    <Td dataLabel="Use Case">
      <Truncate content={model.useCase} />
    </Td>
    <Td dataLabel="Playground">
      {model.playgroundStatus === 'available' ? (
        <Button variant="secondary" onClick={() => onTryInPlayground(model)}>
          Try in playground
        </Button>
      ) : (
        <Button
          variant="link"
          onClick={() => onAddToPlayground(model)}
          icon={<PlusCircleIcon />}
          style={{ padding: 0 }}
        >
          Add to playground
        </Button>
      )}
    </Td>
  </Tr>
);

export default AIModelTableRow;
