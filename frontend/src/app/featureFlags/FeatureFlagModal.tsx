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
} from '@patternfly/react-core';
import { FeatureFlagLauncherProps } from '#~/app/featureFlags/FeatureFlagLauncher';
import { useDevFlags } from '#~/app/featureFlags/useDevFeatureFlags';
import { definedFeatureFlags } from '#~/concepts/areas/const';

type Props = FeatureFlagLauncherProps & { onClose: () => void };

const FeatureFlagModal: React.FC<Props> = ({
  dashboardConfig,
  devFeatureFlags,
  setDevFeatureFlag,
  resetDevFeatureFlags,
  onClose,
}) => {
  const devFlags = useDevFlags();

  const safeDevFeatureFlags = devFeatureFlags || {};

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
      <ModalHeader title="Override Flags" />
      <ModalBody>
        <Content component="h2">Feature Flags</Content>
        <Content component="p">
          Feature flags default to the values defined in the dashboard config.
        </Content>
        {renderFlags(definedFeatureFlags, dashboardConfig)}

        {devFlags.length > 0 ? (
          <>
            <Content component="h2">Dev Flags</Content>
            <Content component="p">
              Dev flags default to inactive and can only be changed for the current session.
            </Content>
            {renderFlags(devFlags)}
          </>
        ) : null}
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
