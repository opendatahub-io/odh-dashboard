import {
  Spinner,
  LabelGroup,
  Label,
  StackItem,
  Stack,
  Tooltip,
  Button,
} from '@patternfly/react-core';
import { PlusIcon } from '@patternfly/react-icons';
import React from 'react';
import { Link } from 'react-router-dom';
import { BYONImage } from '#~/types';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import { FetchState } from '#~/utilities/useFetchState';
import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';

type BYONImageAcceleratorsProps = {
  image: BYONImage;
  acceleratorProfiles: FetchState<AcceleratorProfileKind[]>;
};

export const BYONImageAccelerators: React.FC<BYONImageAcceleratorsProps> = ({
  image,
  acceleratorProfiles,
}) => {
  const [data, loaded, loadError] = acceleratorProfiles;
  const acceleratorAdminPageEnabled = useIsAreaAvailable(SupportedArea.ACCELERATOR_PROFILES).status;

  const recommendedAcceleratorProfiles = data.filter((cr) =>
    image.recommendedAcceleratorIdentifiers.includes(cr.spec.identifier),
  );
  if (loadError) {
    return <>-</>;
  }

  if (!loaded) {
    return <Spinner size="sm" />;
  }

  return (
    <Stack>
      {recommendedAcceleratorProfiles.length > 0 && (
        <StackItem>
          <LabelGroup isCompact>
            {recommendedAcceleratorProfiles.map((cr) => (
              <Label
                key={cr.metadata.name}
                color="blue"
                variant="filled"
                isCompact
                textMaxWidth="16ch"
              >
                {cr.spec.displayName}
              </Label>
            ))}
          </LabelGroup>
        </StackItem>
      )}
      {acceleratorAdminPageEnabled && (
        <StackItem>
          {image.recommendedAcceleratorIdentifiers.length > 0 ? (
            <Tooltip
              content={`This image is compatible with accelerators with the identifier ${image.recommendedAcceleratorIdentifiers.join(
                ', ',
              )}.`}
            >
              <Label
                color="blue"
                variant="outline"
                render={({ className, content }) => (
                  <Link
                    to={`/settings/environment-setup/workbench-images/accelerator-profile/create?${new URLSearchParams(
                      {
                        identifiers: image.recommendedAcceleratorIdentifiers.join(','),
                      },
                    ).toString()}`}
                    className={className}
                  >
                    {content}
                  </Link>
                )}
                isCompact
                icon={<PlusIcon />}
              >
                Create profile
              </Label>
            </Tooltip>
          ) : (
            <Tooltip content="To create an accelerator profile for this image, edit it to include an accelerator identifier.">
              <Button
                isAriaDisabled
                variant="link"
                className="pf-v6-u-font-size-xs"
                isInline
                icon={<PlusIcon />}
              >
                Create profile
              </Button>
            </Tooltip>
          )}
        </StackItem>
      )}
    </Stack>
  );
};
