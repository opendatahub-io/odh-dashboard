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

const AUTORAG_PLAYGROUND_S3_NAMESPACE = process.env.AUTORAG_PLAYGROUND_S3_NAMESPACE ?? '';
const AUTORAG_PLAYGROUND_S3_SECRET_NAME = process.env.AUTORAG_PLAYGROUND_S3_SECRET_NAME ?? '';

// Mocks ---------------------------------------------------------------------->

const envS3Secret: SecretListItem = {
  uuid: 'env-secret-uuid',
  name: AUTORAG_PLAYGROUND_S3_SECRET_NAME,
  type: 'storage',
  data: {},
};

// Scenarios ------------------------------------------------------------------>

interface Scenario {
  label: string;
  s3Secret?: SecretListItem;
}

const scenarioGroups: Record<string, Scenario[]> = {
  Basic: [
    { label: 'No S3 secret (null)', s3Secret: undefined },
    { label: 'From env configuration', s3Secret: envS3Secret },
  ],
};

// App ------------------------------------------------------------------------>

const App: React.FC = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [activeSecret, setActiveSecret] = useState<SecretListItem | undefined>(undefined);

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
          </CardBody>
        </Card>
        <Card>
          <CardTitle>State</CardTitle>
          <CardBody>
            <p>Modal open: {isOpen ? 'Yes' : 'No'}</p>
            <p>Active secret: {activeSecret?.name ?? <em>none</em>}</p>
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
