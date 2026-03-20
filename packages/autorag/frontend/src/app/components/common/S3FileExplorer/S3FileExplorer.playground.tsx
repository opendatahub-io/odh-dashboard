// Modules -------------------------------------------------------------------->

import '@patternfly/react-core/dist/styles/base.css';
import '@patternfly/patternfly/utilities/_index.css';
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Button,
  Card,
  CardTitle,
  CardBody,
  Stack,
  StackItem,
  Flex,
  FlexItem,
  Switch,
} from '@patternfly/react-core';
import type { SecretListItem } from '~/app/types.ts';
import S3FileExplorer from './S3FileExplorer.tsx';

// Environment ---------------------------------------------------------------->

const s3Namespace = process.env.AUTORAG_PLAYGROUND_S3_NAMESPACE ?? '';
const s3SecretName = process.env.AUTORAG_PLAYGROUND_S3_SECRET_NAME ?? '';

// Mocks ---------------------------------------------------------------------->

const mockS3Secret: SecretListItem = {
  uuid: 'mock-secret-uuid-001',
  name: 'my-s3-connection',
  type: 'storage',
  data: {
    AWS_ACCESS_KEY_ID: 'mock-access-key',
    AWS_SECRET_ACCESS_KEY: 'mock-secret-key',
    AWS_S3_BUCKET: 'mock-bucket',
    AWS_S3_ENDPOINT: 'https://s3.amazonaws.com',
    AWS_DEFAULT_REGION: 'us-east-1',
  },
  displayName: 'My S3 Connection',
  description: 'Mock S3 connection for playground testing',
};

// Scenarios ------------------------------------------------------------------>

interface Scenario {
  label: string;
  s3Secret: SecretListItem;
}

const scenarioGroups: Record<string, Scenario[]> = {
  Basic: [
    { label: 'Default S3 connection', s3Secret: mockS3Secret },
    {
      label: 'Minimal secret',
      s3Secret: {
        uuid: 'mock-secret-uuid-002',
        name: 'minimal-connection',
        type: 'storage',
        data: {
          AWS_ACCESS_KEY_ID: 'key',
          AWS_SECRET_ACCESS_KEY: 'secret',
          AWS_S3_BUCKET: 'other-bucket',
        },
      },
    },
  ],
};

// App ------------------------------------------------------------------------>

const App: React.FC = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [activeSecret, setActiveSecret] = useState<SecretListItem>(mockS3Secret);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkTheme) {
      htmlElement.classList.add('pf-v6-theme-dark');
    } else {
      htmlElement.classList.remove('pf-v6-theme-dark');
    }
  }, [isDarkTheme]);

  const openScenario = (scenario: Scenario) => {
    setActiveSecret(scenario.s3Secret);
    setIsOpen(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <Flex
        style={{ width: 'fit-content' }}
        direction={{ default: 'column' }}
        spaceItems={{ default: 'spaceItemsMd' }}
      >
        <Card>
          <CardTitle>Controls</CardTitle>
          <CardBody>
            <Switch
              id="theme-toggle"
              label={isDarkTheme ? 'Dark theme' : 'Light theme'}
              isChecked={isDarkTheme}
              onChange={(_event, checked) => setIsDarkTheme(checked)}
            />
          </CardBody>
        </Card>
        <Card>
          <CardTitle>Configuration</CardTitle>
          <CardBody>
            <p className="pf-v6-u-font-family-monospace">
              <span className="pf-v6-u-text-color-status-danger">
                AUTORAG_PLAYGROUND_S3_NAMESPACE
              </span>
              :
              <span className="pf-v6-u-text-color-status-success">
                &nbsp;
                {s3Namespace || <em>not set</em>}
              </span>
            </p>
            <p className="pf-v6-u-font-family-monospace">
              <span className="pf-v6-u-text-color-status-danger">
                AUTORAG_PLAYGROUND_S3_SECRET_NAME
              </span>
              :
              <span className="pf-v6-u-text-color-status-success">
                &nbsp;
                {s3SecretName || <em>not set</em>}
              </span>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardTitle>State</CardTitle>
          <CardBody>
            <p>Modal open: {isOpen ? 'Yes' : 'No'}</p>
            <p>Active secret: {activeSecret.name}</p>
          </CardBody>
        </Card>
        <Card>
          <CardTitle>Scenarios</CardTitle>
          <CardBody>
            <Stack>
              {Object.entries(scenarioGroups).map(([groupLabel, scenarios]) => (
                <React.Fragment key={groupLabel}>
                  <StackItem className="pf-v6-u-font-weight-bold pf-v6-u-font-size-md pf-v6-u-mt-sm pf-v6-u-mb-sm">
                    {groupLabel}
                  </StackItem>
                  <StackItem>
                    <Flex>
                      {scenarios.map((scenario) => (
                        <FlexItem key={scenario.label}>
                          <Button variant="secondary" onClick={() => openScenario(scenario)}>
                            {scenario.label}
                          </Button>
                        </FlexItem>
                      ))}
                    </Flex>
                  </StackItem>
                </React.Fragment>
              ))}
            </Stack>
          </CardBody>
        </Card>
      </Flex>

      <S3FileExplorer
        id="playground-s3-file-explorer"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        s3Secret={activeSecret}
      />
    </div>
  );
};

const container = document.createElement('div');
document.body.appendChild(container);
createRoot(container).render(<App />);
