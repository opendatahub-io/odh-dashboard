import {
  Button,
  Content,
  FormFieldGroupExpandable,
  FormFieldGroupHeader,
  FormGroup,
  Icon,
  Popover,
  Radio,
  Skeleton,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import React, { useEffect, useState } from 'react';
import { getConfigMap } from '~/api';
import { useLMDashboardNamespace } from '~/pages/lmEvaluations/utilities/useLMDashboardNamespace';

type LmEvaluationSecuritySectionProps = {
  allowRemoteCode: boolean;
  allowOnline: boolean;
  setAllowRemoteCode: (allowRemoteCode: boolean) => void;
  setAllowOnline: (allowOnline: boolean) => void;
};

const LmEvaluationSecuritySection: React.FC<LmEvaluationSecuritySectionProps> = ({
  allowRemoteCode,
  allowOnline,
  setAllowRemoteCode,
  setAllowOnline,
}) => {
  const [isOnlineDisabled, setIsOnlineDisabled] = useState(false);
  const [isRemoteCodeDisabled, setIsRemoteCodeDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { dashboardNamespace } = useLMDashboardNamespace();

  useEffect(() => {
    const fetchConfigMap = async () => {
      try {
        setIsLoading(true);
        const configMap = await getConfigMap(
          dashboardNamespace,
          'trustyai-service-operator-config',
        );
        const isOnlineAllowed = configMap.data?.['lmes-allow-online'] === 'true';
        const isRemoteCodeAllowed = configMap.data?.['lmes-allow-code-execution'] === 'true';
        setIsRemoteCodeDisabled(!isRemoteCodeAllowed);
        setIsOnlineDisabled(!isOnlineAllowed);
        if (!isOnlineAllowed) {
          setAllowOnline(false);
        }
      } catch (error) {
        setAllowOnline(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfigMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <FormFieldGroupExpandable
      style={{ border: 0 }}
      isExpanded
      toggleAriaLabel="Details"
      header={
        <FormFieldGroupHeader
          titleText={{
            text: <div className="pf-v6-c-form__section-title">Security settings</div>,
            id: 'field-security-settings',
          }}
          titleDescription={
            <Content component="p" className="odh-form-section__desc">
              These settings can only be changed if they are active globally
            </Content>
          }
        />
      }
    >
      <>
        <FormGroup
          label="Available online"
          isRequired
          fieldId="1-expanded-group1-label1"
          labelHelp={
            <Popover bodyContent={<></>}>
              <Button
                icon={
                  <Icon isInline>
                    <OutlinedQuestionCircleIcon />
                  </Icon>
                }
                variant="plain"
                isInline
              />
            </Popover>
          }
        >
          {!isLoading ? (
            <>
              <Radio
                name="allow-online-true-radio"
                id="allow-online-true-radio"
                label="True"
                isChecked={allowOnline}
                onChange={() => setAllowOnline(true)}
                isDisabled={isOnlineDisabled}
              />
              <Radio
                name="allow-online-false-radio"
                id="allow-online-false-radio"
                label="False"
                isChecked={!allowOnline}
                onChange={() => setAllowOnline(false)}
                isDisabled={isOnlineDisabled}
              />
            </>
          ) : (
            <Skeleton />
          )}
        </FormGroup>
        <FormGroup
          label="Trust remote code"
          isRequired
          fieldId="trust-remote-code"
          labelHelp={
            <Popover bodyContent={<></>}>
              <Button
                icon={
                  <Icon isInline>
                    <OutlinedQuestionCircleIcon />
                  </Icon>
                }
                variant="plain"
                isInline
              />
            </Popover>
          }
        >
          {!isLoading ? (
            <>
              <Radio
                name="trust-remote-code-true-radio"
                id="trust-remote-code-true-radio"
                label="True"
                isChecked={allowRemoteCode}
                onChange={() => setAllowRemoteCode(true)}
                isDisabled={isRemoteCodeDisabled}
              />
              <Radio
                name="trust-remote-code-false-radio"
                id="trust-remote-code-false-radio"
                label="False"
                isChecked={!allowRemoteCode}
                onChange={() => setAllowRemoteCode(false)}
                isDisabled={isRemoteCodeDisabled}
              />
            </>
          ) : (
            <Skeleton />
          )}
        </FormGroup>
      </>
    </FormFieldGroupExpandable>
  );
};

export default LmEvaluationSecuritySection;
