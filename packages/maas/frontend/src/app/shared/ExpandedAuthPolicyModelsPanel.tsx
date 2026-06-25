import * as React from 'react';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { Content, ContentVariants } from '@patternfly/react-core';
import { ModelRef } from '~/app/types/subscriptions';

type ExpandedAuthPolicyModelsPanelProps = {
  models: ModelRef[];
};

const ExpandedAuthPolicyModelsPanel: React.FC<ExpandedAuthPolicyModelsPanelProps> = ({
  models,
}) => (
  <Table
    aria-label="Auth policy models"
    data-testid="auth-policy-models-expanded-panel"
    variant="compact"
    borders
  >
    <Thead>
      <Tr>
        <Th>Model name</Th>
      </Tr>
    </Thead>
    <Tbody>
      {models.length === 0 ? (
        <Tr>
          <Td data-testid="empty-auth-policy-models-expanded-panel">No models</Td>
        </Tr>
      ) : (
        models.map((model) => (
          <Tr key={`${model.namespace}/${model.name}`} data-testid="expanded-auth-policy-model-row">
            <Td dataLabel="Model name">
              <span
                className="pf-v6-u-font-weight-bold"
                data-testid="auth-policy-expanded-model-display-name"
              >
                {model.displayName ?? model.name}
              </span>
              {model.displayName && model.displayName !== model.name && (
                <Content data-testid="auth-policy-expanded-model-resource-name">
                  {model.name}
                </Content>
              )}
              {model.description && (
                <Content
                  component={ContentVariants.small}
                  data-testid="auth-policy-expanded-model-description"
                >
                  {model.description}
                </Content>
              )}
            </Td>
          </Tr>
        ))
      )}
    </Tbody>
  </Table>
);

export default ExpandedAuthPolicyModelsPanel;
