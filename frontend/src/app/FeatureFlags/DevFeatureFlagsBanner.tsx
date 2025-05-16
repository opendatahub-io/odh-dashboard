import { Banner, Button, Split, SplitItem, Tooltip } from '@patternfly/react-core';
import { CloseIcon } from '@patternfly/react-icons';
import * as React from 'react';

import { DashboardCommonConfig } from '~/k8sTypes';
import { DevFeatureFlags } from '~/types';
import FeatureFlagModal from './FeatureFlagModal';

type Props = { dashboardConfig: Partial<DashboardCommonConfig> } & DevFeatureFlags;

const DevFeatureFlagsBanner: React.FC<Props> = ({
  dashboardConfig,
  devFeatureFlags,
  setDevFeatureFlag,
  resetDevFeatureFlags,
  setDevFeatureFlagQueryVisible,
  isBannerVisible,
}) => {
  const [isBannerHidden, setBannerHidden] = React.useState(false);
  const [isModalOpen, setModalOpen] = React.useState(false);

  if (!isBannerVisible || !devFeatureFlags || isBannerHidden) {
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
        <FeatureFlagModal
          onClose={() => {
            setModalOpen(false);
            setDevFeatureFlagQueryVisible(false);
          }}
          dashboardConfig={dashboardConfig}
          devFeatureFlags={devFeatureFlags}
          setDevFeatureFlag={setDevFeatureFlag}
          resetDevFeatureFlags={resetDevFeatureFlags}
        />
      ) : null}
    </>
  );
};

export default DevFeatureFlagsBanner;
