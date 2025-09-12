import React from 'react';
import { Button, ButtonVariant, FlexItem, Tooltip } from '@patternfly/react-core';
import { ModelVersion } from '~/app/types';
import LabTuneModalExtension from '~/odh/components/LabTuneModalExtension';

export const MRLabTuneButton = ({ mv }: { mv: ModelVersion }) => (
  <LabTuneModalExtension
    mv={mv}
    render={(buttonState, onOpenModal, isModalAvailable) => {
      const labTuneButton = (
        <Button
          id="lab-tune-button"
          aria-label="LAB-tune version"
          variant={ButtonVariant.secondary}
          onClick={onOpenModal}
          isAriaDisabled={!buttonState?.enabled}
          data-testid="lab-tune-button"
        >
          LAB-tune
        </Button>
      );
      return isModalAvailable ? (
        <FlexItem>
          {buttonState.tooltip ? (
            <Tooltip content={buttonState.tooltip}>{labTuneButton}</Tooltip>
          ) : (
            labTuneButton
          )}
        </FlexItem>
      ) : null;
    }}
  />
);
