import * as React from 'react';
import {
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  Title,
} from '@patternfly/react-core';

type PlaceholderStepProps = {
  title: string;
};

const PlaceholderStep: React.FC<PlaceholderStepProps> = ({ title }) => (
  <Form>
    <FormSection title={title}>
      <FormGroup label={title} fieldId={`deploy-agent-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <Title headingLevel="h3" size="md">
          Coming soon
        </Title>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>This step will be implemented in a follow-up story.</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </FormSection>
  </Form>
);

export default PlaceholderStep;
