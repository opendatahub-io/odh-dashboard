import * as React from 'react';
import {
  Button,
  Checkbox,
  Grid,
  GridItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from '@patternfly/react-core';

import { allFeatureFlags } from '~/concepts/areas/const';
import { isFeatureFlag } from '~/concepts/areas/utils';
import { FeatureFlagModalProps } from '~/types';

const DevFeatureFlagsBanner: React.FC<FeatureFlagModalProps> = ({
  dashboardConfig,
  devFeatureFlags,
  setDevFeatureFlag,
  resetDevFeatureFlags,
  onClose,
}) => {
  const renderDevFeatureFlags = () => (
    <Grid hasGutter span={6} md={3}>
      {allFeatureFlags
        .filter(isFeatureFlag)
        .toSorted()
        .map((key) => {
          const value = devFeatureFlags[key] ?? dashboardConfig[key];
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
                key in devFeatureFlags ? ' (overridden)' : ''
              }`}</GridItem>
            </React.Fragment>
          );
        })}
    </Grid>
  );
  return (
    <Modal data-testid="dev-feature-flags-modal" variant="large" isOpen onClose={onClose}>
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

export default DevFeatureFlagsBanner;
