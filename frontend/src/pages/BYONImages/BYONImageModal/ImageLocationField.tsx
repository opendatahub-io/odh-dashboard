import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Popover,
  TextInput,
} from '@patternfly/react-core';
import { HelpIcon } from '@patternfly/react-icons';

type ImageLocationFieldProps = {
  location: string;
  setLocation: (location: string) => void;
  isDisabled: boolean;
};

const ImageLocationField: React.FC<ImageLocationFieldProps> = ({
  location,
  setLocation,
  isDisabled,
}) => (
  <FormGroup
    label="Image location"
    isRequired
    fieldId="byon-image-location-input"
    labelHelp={
      <Popover
        aria-label="Image location help popover"
        headerContent="Location examples"
        hasAutoWidth
        bodyContent={
          <>
            <p>quay.io/my-repo/my-image:tag</p>
            <p>quay.io/my-repo/my-image@sha256:xxxxxxxxxxxxx</p>
            <p>docker.io/my-repo/my-image:tag</p>
          </>
        }
      >
        <HelpIcon />
      </Popover>
    }
  >
    <TextInput
      id="byon-image-location-input"
      isRequired
      type="text"
      data-testid="byon-image-location-input"
      name="byon-image-location-input"
      aria-describedby="byon-image-location-input"
      value={location}
      onChange={(e, value) => {
        setLocation(value);
      }}
      isDisabled={isDisabled}
    />
    <FormHelperText>
      <HelperText>
        <HelperTextItem>
          The address where the notebook image is located. See the help icon for examples.
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  </FormGroup>
);

export default ImageLocationField;
