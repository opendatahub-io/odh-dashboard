import {
  Banner,
  Button,
  Checkbox,
  Grid,
  GridItem,
  Split,
  SplitItem,
  Tooltip,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';
import { CloseIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { allFeatureFlags } from '~/concepts/areas/const';
import { isFeatureFlag } from '~/concepts/areas/utils';
import { DashboardCommonConfig } from '~/k8sTypes';
import { DevFeatureFlags } from '~/types';

type Props = { dashboardConfig: Partial<DashboardCommonConfig> } & DevFeatureFlags;

type DevFeatureFlagsModalProps = {
  onClose: () => void;
  devFeatureFlags: Partial<DashboardCommonConfig> | null;
  dashboardConfig: Partial<DashboardCommonConfig>;
  setDevFeatureFlag: (key: keyof DashboardCommonConfig, value: boolean) => void;
  resetDevFeatureFlags: () => void;
};

const DevFeatureFlagsModal: React.FC<DevFeatureFlagsModalProps> = ({
  onClose,
  devFeatureFlags,
  dashboardConfig,
  setDevFeatureFlag,
  resetDevFeatureFlags,
}) => {
  const renderDevFeatureFlags = () => (
    <Grid hasGutter span={6} md={3}>
      {allFeatureFlags
        .filter(isFeatureFlag)
        .toSorted()
        .map((key) => {
          const value =
            devFeatureFlags[key as string] ?? dashboardConfig[key as keyof DashboardCommonConfig];
          return (
            <React.Fragment key={key}>
              <GridItem>
                <Checkbox
                  id={key}
                  data-testid={`${key}-checkbox`}
                  label={key}
                  isChecked={value ?? null}
                  onChange={(_, checked) => {
                    setDevFeatureFlag(key as keyof DashboardCommonConfig, checked);
                  }}
                />
              </GridItem>
              <GridItem data-testid={`${key}-value`}>{`${value ?? ''}${
                key in devFeatureFlags ? ' (overridden)' : ''
              }`}</GridItem>
            </React.Fragment>
          );
        })}
    </Grid>
  );

  return (
    <Modal data-testid="dev-feature-flags-modal" variant="large" onClose={onClose}>
      <ModalHeader title="Feature flags" />
      <ModalBody>{renderDevFeatureFlags()}</ModalBody>
      <ModalFooter>
        <Button
          data-testid="reset-feature-flags-modal-button"
          key="confirm"
          variant="link"
          onClick={() => resetDevFeatureFlags()}
        >
          Reset to defaults
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const DevFeatureFlagsBanner: React.FC<Props> = ({
  dashboardConfig,
  devFeatureFlags,
  setDevFeatureFlag,
  resetDevFeatureFlags,
  setDevFeatureFlagQueryVisible,
}) => {
  const [isBannerHidden, setBannerHidden] = React.useState(false);
  const [isModalOpen, setModalOpen] = React.useState(false);

  if (!devFeatureFlags || isBannerHidden) {
    return null;
  }

  return (
    <>
      <Banner color="blue">
        <Split>
          <SplitItem isFilled>
            Feature flags are{' '}
            <Button
              data-testid="override-feature-flags-button"
              variant="link"
              isInline
              onClick={() => {
                setModalOpen(true);
                setDevFeatureFlagQueryVisible(true);
              }}
            >
              overridden
            </Button>{' '}
            in the current session.{' '}
            <Button
              data-testid="reset-feature-flags-button"
              variant="link"
              isInline
              onClick={resetDevFeatureFlags}
            >
              Click here
            </Button>{' '}
            to reset back to defaults.
          </SplitItem>
          <SplitItem>
            <Tooltip content="Close the banner and keep feature flag overrides active. Refresh the page to reveal the banner.">
              <Button
                data-testid="hide-banner-button"
                variant="link"
                isInline
                onClick={() => setBannerHidden(true)}
                icon={<CloseIcon />}
                aria-label="hide banner"
              />
            </Tooltip>
          </SplitItem>
        </Split>
      </Banner>
      {isModalOpen ? (
        <DevFeatureFlagsModal
          onClose={() => {
            setModalOpen(false);
            setDevFeatureFlagQueryVisible(false);
          }}
          devFeatureFlags={devFeatureFlags}
          dashboardConfig={dashboardConfig}
          setDevFeatureFlag={setDevFeatureFlag}
          resetDevFeatureFlags={resetDevFeatureFlags}
        />
      ) : null}
    </>
  );
};

export default DevFeatureFlagsBanner;
