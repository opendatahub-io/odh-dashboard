import { Content, Flex, FlexItem, Popover } from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import * as React from 'react';

type ConfigureFormGroupProps = {
  children: React.ReactNode;
  label: string;
  labelHelp?: { header: string; body: string };
  description?: React.ReactNode;
  isRequired?: boolean;
};

/**
 * Grouped form section with consistent styling, optional help popover,
 * and required field indicator. Provides a standardized layout for form
 * fields with label, description, and inline help documentation.
 *
 * The component automatically generates test IDs based on the label prop
 * for easier testing and accessibility.
 *
 * @param props - Component props
 * @param props.children - Form field content (inputs, selectors, etc.)
 * @param props.label - Label text displayed above the form field
 * @param props.labelHelp - Optional help popover with header and body content
 * @param props.description - Optional descriptive text displayed below the label
 * @param props.isRequired - If true, displays a required indicator (*) next to the label
 *
 * @example
 * <ConfigureFormGroup
 *   label="S3 connection"
 *   description="Select your S3 connection"
 *   isRequired
 *   labelHelp={{ header: "S3 Connection", body: "Choose an existing S3 connection or create a new one" }}
 * >
 *   <SecretSelector />
 * </ConfigureFormGroup>
 *
 * @example
 * // Simple usage without help or description
 * <ConfigureFormGroup label="Model name">
 *   <TextInput />
 * </ConfigureFormGroup>
 */
const ConfigureFormGroup: React.FC<ConfigureFormGroupProps> = (props: ConfigureFormGroupProps) => {
  const testIdBase = props.label.toLowerCase().replace(/\s+/g, '-') || 'form-group';

  return (
    <Flex
      direction={{ default: 'column' }}
      gap={{ default: 'gapSm' }}
      data-testid={`configure-form-group-${testIdBase}`}
    >
      <Flex gap={{ default: 'gapXs' }}>
        <FlexItem>
          <Content component="h4" data-testid={`configure-form-group-label-${testIdBase}`}>
            <span>{props.label}</span>
            {props.isRequired && <span className="pf-v6-c-form__label-required">*</span>}
          </Content>
        </FlexItem>
        {props.labelHelp && (
          <Popover
            aria-label={`${props.label} help`}
            headerContent={props.labelHelp.header}
            bodyContent={props.labelHelp.body}
          >
            <DashboardPopupIconButton
              aria-label={`More info for ${props.label.toLocaleLowerCase()}`}
              icon={<OutlinedQuestionCircleIcon />}
              hasNoPadding
              data-testid={`configure-form-group-help-${testIdBase}`}
            />
          </Popover>
        )}
      </Flex>
      {props.description && (
        <FlexItem>
          <Content component="small" data-testid={`configure-form-group-description-${testIdBase}`}>
            {props.description}
          </Content>
        </FlexItem>
      )}
      {props.children}
    </Flex>
  );
};

export default ConfigureFormGroup;
