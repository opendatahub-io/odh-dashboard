import * as React from 'react';
import { Alert, AlertProps, Label, Popover } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { ServingRuntimeVersionStatusLabel } from './const';

type ServingRuntimeVersionStatusProps = {
  isOutdated?: boolean;
  version: string;
  templateVersion: string;
};

const ServingRuntimeVersionStatus: React.FC<ServingRuntimeVersionStatusProps> = ({
  isOutdated,
  version,
  templateVersion,
}) => {
  const [isPopoverVisible, setIsPopoverVisible] = React.useState(false);
  const getPopoverText = (): {
    title: string;
    body: React.ReactNode;
    variant: AlertProps['variant'];
    footer?: React.ReactNode;
  } => {
    if (isOutdated) {
      return {
        title: 'Serving runtime outdated',
        body: (
          <p>
            This serving runtime is outdated.
            <br />
            <b>Your version:</b> {version}
            <br />
            <b>Latest version:</b> {templateVersion}
          </p>
        ),
        variant: 'warning',
      };
    }
    return {
      title: 'Serving runtime up to date',
      body: <p>This serving runtime is up to date.</p>,
      variant: 'success',
    };
  };
  const { title, body, variant } = getPopoverText();
  return (
    <>
      <Popover
        isVisible={isPopoverVisible}
        shouldOpen={() => setIsPopoverVisible(true)}
        shouldClose={() => setIsPopoverVisible(false)}
        headerContent={<Alert variant={variant} isInline isPlain title={title} />}
        bodyContent={body}
      >
        <Label
          data-testid="serving-runtime-version-status-label"
          color={isOutdated ? 'yellow' : 'green'}
          icon={isOutdated ? <ExclamationTriangleIcon /> : <CheckCircleIcon />}
          isCompact
        >
          {isOutdated
            ? ServingRuntimeVersionStatusLabel.OUTDATED
            : ServingRuntimeVersionStatusLabel.LATEST}
        </Label>
      </Popover>
    </>
  );
};
export default ServingRuntimeVersionStatus;
