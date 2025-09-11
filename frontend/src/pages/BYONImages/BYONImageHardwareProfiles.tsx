import React from 'react';
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
import { Link } from 'react-router-dom';
import { BYONImage } from '#~/types';
import { filterHardwareProfilesByRecommendedIdentifiers } from '#~/pages/BYONImages/utils';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility.ts';
import { getHardwareProfileDisplayName } from '#~/pages/hardwareProfiles/utils';

type BYONImageHardwareProfilesProps = {
  image: BYONImage;
  hardwareProfiles: ReturnType<typeof useHardwareProfilesByFeatureVisibility>;
};

const BYONImageHardwareProfiles: React.FC<BYONImageHardwareProfilesProps> = ({
  image,
  hardwareProfiles,
}) => {
  const [data, loaded, loadError] = hardwareProfiles;

  const recommendedHardwareProfiles = filterHardwareProfilesByRecommendedIdentifiers(
    data,
    image.recommendedAcceleratorIdentifiers,
  );

  if (loadError) {
    return <>-</>;
  }

  if (!loaded) {
    return <Spinner size="sm" />;
  }

  return (
    <Stack>
      {recommendedHardwareProfiles.length > 0 && (
        <StackItem>
          <LabelGroup isCompact>
            {recommendedHardwareProfiles.map((cr) => (
              <Label
                key={cr.metadata.name}
                color="blue"
                variant="filled"
                isCompact
                textMaxWidth="16ch"
              >
                {getHardwareProfileDisplayName(cr)}
              </Label>
            ))}
          </LabelGroup>
        </StackItem>
      )}
      <StackItem>
        {image.recommendedAcceleratorIdentifiers.length > 0 ? (
          <Tooltip
            content={`This image is compatible with hardware profiles with the identifier ${image.recommendedAcceleratorIdentifiers.join(
              ', ',
            )}.`}
          >
            <Label
              color="blue"
              variant="outline"
              render={({ className, content }) => (
                <Link
                  to={`/workbenchImages/hardwareProfile/create?${new URLSearchParams({
                    identifiers: image.recommendedAcceleratorIdentifiers.join(','),
                  }).toString()}`}
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
          <Tooltip content="To create a hardware profile for this image, edit it to include a hardware profile identifier.">
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
    </Stack>
  );
};

export default BYONImageHardwareProfiles;
