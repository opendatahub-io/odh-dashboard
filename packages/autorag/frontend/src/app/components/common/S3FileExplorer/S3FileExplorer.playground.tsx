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
import type { Files } from '~/app/components/common/FileExplorer/FileExplorer.tsx';
import S3FileExplorer from './S3FileExplorer.tsx';

// Environment ---------------------------------------------------------------->

const AUTORAG_PLAYGROUND_S3_NAMESPACE = process.env.AUTORAG_PLAYGROUND_S3_NAMESPACE ?? '';
const AUTORAG_PLAYGROUND_S3_SECRET_NAME = process.env.AUTORAG_PLAYGROUND_S3_SECRET_NAME ?? '';
const AUTORAG_PLAYGROUND_S3_SECRET_NAME_NO_BUCKET =
  process.env.AUTORAG_PLAYGROUND_S3_SECRET_NAME_NO_BUCKET ?? '';
const AUTORAG_PLAYGROUND_S3_SECRET_NAME_HTTP =
  process.env.AUTORAG_PLAYGROUND_S3_SECRET_NAME_HTTP ?? '';

// Mocks ---------------------------------------------------------------------->

// Scenarios ------------------------------------------------------------------>

interface Scenario {
  label: string;
  namespace: string;
  s3Secret?: SecretListItem;
}

const scenarioGroups: Record<string, Scenario[]> = {
  Basic: [
    {
      label: 'From env configuration',
      namespace: AUTORAG_PLAYGROUND_S3_NAMESPACE,
      s3Secret: {
        uuid: 'env-secret-uuid',
        name: AUTORAG_PLAYGROUND_S3_SECRET_NAME,
        type: 'storage',
        data: {},
      },
    },
  ],
  Errors: [
    {
      label: 'Invalid secret (not found)',
      namespace: AUTORAG_PLAYGROUND_S3_NAMESPACE,
      s3Secret: {
        uuid: 'fake-secret-uuid',
        name: 'non-existent-secret',
        type: 'storage',
        data: {},
      },
    },
    {
      label: 'No bucket configured',
      namespace: AUTORAG_PLAYGROUND_S3_NAMESPACE,
      s3Secret: {
        uuid: 'no-bucket-secret-uuid',
        name: AUTORAG_PLAYGROUND_S3_SECRET_NAME_NO_BUCKET,
        type: 'storage',
        data: {},
      },
    },
    {
      label: 'Connection using HTTP',
      namespace: AUTORAG_PLAYGROUND_S3_NAMESPACE,
      s3Secret: {
        uuid: 'http-secret-uuid',
        name: AUTORAG_PLAYGROUND_S3_SECRET_NAME_HTTP,
        type: 'storage',
        data: {},
      },
    },
    {
      label: 'Generic error',
      namespace: AUTORAG_PLAYGROUND_S3_NAMESPACE,
      s3Secret: {
        uuid: 'env-secret-uuid',
        name: AUTORAG_PLAYGROUND_S3_SECRET_NAME,
        type: 'storage',
        data: {},
      },
    },
  ],
};

// App ------------------------------------------------------------------------>

const App: React.FC = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeNamespace, setActiveNamespace] = useState('mock-playground-namespace');
  const [activeSecret, setActiveSecret] = useState<SecretListItem | undefined>(undefined);
  const [selectedFiles, setSelectedFiles] = useState<Files>([]);

  useEffect(() => {
    const htmlElement = document.documentElement;
    if (isDarkTheme) {
      htmlElement.classList.add('pf-v6-theme-dark');
    } else {
      htmlElement.classList.remove('pf-v6-theme-dark');
    }
  }, [isDarkTheme]);

  const openScenario = (scenario: Scenario) => {
    setActiveNamespace(scenario.namespace);
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
                {AUTORAG_PLAYGROUND_S3_NAMESPACE || <em>not set</em>}
              </span>
            </p>
            <p className="pf-v6-u-font-family-monospace">
              <span className="pf-v6-u-text-color-status-danger">
                AUTORAG_PLAYGROUND_S3_SECRET_NAME
              </span>
              :
              <span className="pf-v6-u-text-color-status-success">
                &nbsp;
                {AUTORAG_PLAYGROUND_S3_SECRET_NAME || <em>not set</em>}
              </span>
            </p>
            <p className="pf-v6-u-font-family-monospace">
              <span className="pf-v6-u-text-color-status-danger">
                AUTORAG_PLAYGROUND_S3_SECRET_NAME_NO_BUCKET
              </span>
              :
              <span className="pf-v6-u-text-color-status-success">
                &nbsp;
                {AUTORAG_PLAYGROUND_S3_SECRET_NAME_NO_BUCKET || <em>not set</em>}
              </span>
            </p>
            <p className="pf-v6-u-font-family-monospace">
              <span className="pf-v6-u-text-color-status-danger">
                AUTORAG_PLAYGROUND_S3_SECRET_NAME_HTTP
              </span>
              :
              <span className="pf-v6-u-text-color-status-success">
                &nbsp;
                {AUTORAG_PLAYGROUND_S3_SECRET_NAME_HTTP || <em>not set</em>}
              </span>
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardTitle>State</CardTitle>
          <CardBody>
            <p>Modal open: {isOpen ? 'Yes' : 'No'}</p>
            <p>Active namespace: {activeNamespace}</p>
            <p>Active secret: {activeSecret?.name ?? <em>none</em>}</p>
            <p>
              Selected files ({selectedFiles.length}):{' '}
              {selectedFiles.length > 0 ? (
                selectedFiles.map((f) => f.name).join(', ')
              ) : (
                <em>none</em>
              )}
            </p>
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
        namespace={activeNamespace}
        s3Secret={activeSecret}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSelectFiles={(files) => setSelectedFiles(files)}
        selectableExtensions={['json', 'txt']}
        unselectableReason="You can only select JSON or TXT files"
      />
    </div>
  );
};

const container = document.createElement('div');
document.body.appendChild(container);
createRoot(container).render(<App />);
