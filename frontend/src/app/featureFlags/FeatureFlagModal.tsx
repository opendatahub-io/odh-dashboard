import * as React from 'react';
import {
  Button,
  Checkbox,
  Content,
  Grid,
  GridItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Tab,
  TabTitleText,
  Tabs,
} from '@patternfly/react-core';
import { FeatureFlagLauncherProps } from '#~/app/featureFlags/FeatureFlagLauncher';
import { useDevFlags } from '#~/app/featureFlags/useDevFeatureFlags';
import {
  devTemporaryFeatureFlags,
  techPreviewFlags,
  coreDashboardFlags,
  projectManagementFlags,
  modelServingFlags,
  advancedAIMLFlags,
} from '#~/concepts/areas/const';

type Props = FeatureFlagLauncherProps & { onClose: () => void };

const FeatureFlagModal: React.FC<Props> = ({
  dashboardConfig,
  devFeatureFlags,
  setDevFeatureFlag,
  resetDevFeatureFlags,
  onClose,
}) => {
  const devFlags = useDevFlags();
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);

  const safeDevFeatureFlags = devFeatureFlags || {};
  console.log('safe dev feature flags:', safeDevFeatureFlags);
  console.log('dashboardConfig:', dashboardConfig);
  // ok; so the default values are from the SERVER (see lines 52-60 of App.tsx)
  // which is why 'newer' flags have an indeterminate checkbox state.
  // talk about this with gage and/or andrew TODO
  const renderFlags = (flags: string[], fallbackFlags?: Record<string, boolean | undefined>) => (
    <Grid hasGutter span={6} md={3}>
      {flags.toSorted().map((key) => {
        const value = safeDevFeatureFlags[key] ?? fallbackFlags?.[key];
        return (
          <React.Fragment key={key}>
            <GridItem>
              <Checkbox
                id={key}
                data-testid={`${key}-checkbox`}
                label={key}
                isChecked={value ?? null}
                onChange={(_, checked) => {
                  setDevFeatureFlag(key, checked);
                }}
              />
            </GridItem>
            <GridItem data-testid={`${key}-value`}>{`${value ?? ''}${
              key in safeDevFeatureFlags ? ' (overridden)' : ''
            }`}</GridItem>
          </React.Fragment>
        );
      })}
    </Grid>
  );

  return (
    <Modal data-testid="dev-feature-flags-modal" variant="large" isOpen onClose={onClose}>
      <ModalHeader title="Feature Flags: Override Flags" />
      <ModalBody>
        <Tabs activeKey={activeTabKey} onSelect={(_event, tabIndex) => setActiveTabKey(tabIndex)}>
          <Tab eventKey={0} title={<TabTitleText>Active</TabTitleText>}>
            <Content style={{ height: '400px', padding: '8px' }}>
              <Content component="p">
                Feature flags default to the values defined in the dashboard config from the server.
              </Content>
              <Content component="p">
                Flags that have an indeterminate value are because they are *not* defined in the
                server.
              </Content>
              <h2> Tech Preview Flags </h2>
              {renderFlags(Object.keys(techPreviewFlags), dashboardConfig)}
              <h2> Temporary Developer Feature Flags</h2>
              {renderFlags(Object.keys(devTemporaryFeatureFlags), dashboardConfig)}
            </Content>
          </Tab>
          {devFlags.length > 0 && (
            <Tab eventKey={1} title={<TabTitleText>Dev Flags</TabTitleText>}>
              <Content style={{ height: '400px', padding: '8px' }}>
                <Content component="p">
                  Dev flags default to inactive and can only be changed for the current session.
                </Content>
                {renderFlags(devFlags)}
              </Content>
            </Tab>
          )}
          <Tab eventKey={2} title={<TabTitleText>Legacy</TabTitleText>}>
            <Content style={{ height: '400px', padding: '8px' }}>
              <Content component="p">
                These feature flags are hardly used and cannot be deleted yet at this time.
              </Content>
              <Content component="p">
                Some of them may be deprecated soon; but most of them are permanent.
              </Content>
              <h2>Core Dashboard Flags</h2>
              {renderFlags(Object.keys(coreDashboardFlags), dashboardConfig)}
              <h2>Project & User Management Flags</h2>
              {renderFlags(Object.keys(projectManagementFlags), dashboardConfig)}
              <h2>Model Serving & AI/ML Infrastructure Flags</h2>
              {renderFlags(Object.keys(modelServingFlags), dashboardConfig)}
              <h2>Advanced AI/ML Features & Pipelines Flags</h2>
              {renderFlags(Object.keys(advancedAIMLFlags), dashboardConfig)}
            </Content>
          </Tab>
        </Tabs>
      </ModalBody>
      <ModalFooter>
        <Button
          data-testid="reset-feature-flags-modal-button"
          key="confirm"
          variant="link"
          onClick={() => resetDevFeatureFlags(false)}
        >
          Reset to defaults
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default FeatureFlagModal;
