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

const ConfigureFormGroup: React.FC<ConfigureFormGroupProps> = (props: ConfigureFormGroupProps) => (
  <Flex direction={{ default: 'column' }} gap={{ default: 'gapSm' }}>
    <Flex gap={{ default: 'gapXs' }}>
      <FlexItem>
        <Content component="h4">
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
          />
        </Popover>
      )}
    </Flex>
    {props.description && (
      <FlexItem>
        <Content component="small">{props.description}</Content>
      </FlexItem>
    )}
    {props.children}
  </Flex>
);

export default ConfigureFormGroup;
