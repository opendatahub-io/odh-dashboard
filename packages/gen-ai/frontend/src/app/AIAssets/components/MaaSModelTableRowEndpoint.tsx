import * as React from 'react';
import {
  Button,
  ButtonVariant,
  ClipboardCopy,
  Content,
  Flex,
  FlexItem,
  Popover,
  Alert,
  AlertVariant,
  Spinner,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { MaaSModel } from '~/app/types';
import useGenerateMaaSToken from '~/app/hooks/useGenerateMaaSToken';

type MaaSModelTableRowEndpointProps = {
  model: MaaSModel;
};

const MaaSModelTableRowEndpoint: React.FC<MaaSModelTableRowEndpointProps> = ({ model }) => {
  const { isGenerating, tokenData, error, generateToken, resetToken } = useGenerateMaaSToken();

  if (!model.url) {
    return <span>-</span>;
  }

  const handleGenerateToken = () => {
    generateToken();
  };

  return (
    <Popover
      position="right"
      minWidth="400px"
      aria-label={`MaaS route for ${model.id}`}
      headerComponent="h2"
      headerContent={
        <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
          Model as a service (MaaS) route
        </Content>
      }
      bodyContent={
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
          <FlexItem>
            <ClipboardCopy
              hoverTip="Copy"
              clickTip="Copied"
              aria-label={`MaaS route URL for ${model.id}`}
            >
              {model.url}
            </ClipboardCopy>
          </FlexItem>
          <FlexItem>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
                  API token
                </Content>
              </FlexItem>

              {!tokenData && !error && (
                <FlexItem>
                  <Button
                    variant={ButtonVariant.primary}
                    isDisabled={isGenerating}
                    onClick={handleGenerateToken}
                    icon={isGenerating ? <Spinner size="sm" /> : undefined}
                  >
                    Generate API token
                  </Button>
                </FlexItem>
              )}

              {tokenData && (
                <FlexItem>
                  <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                    <FlexItem>
                      <Alert
                        variant={AlertVariant.info}
                        title="Important: Copy and store this token"
                        isInline
                        customIcon={<InfoCircleIcon />}
                      >
                        This token can be viewed only once, and will be unavailable after you close
                        this dialog.
                      </Alert>
                    </FlexItem>
                    <FlexItem>
                      <ClipboardCopy
                        hoverTip="Copy"
                        clickTip="Copied"
                        aria-label="Generated MaaS API token"
                      >
                        {tokenData.token}
                      </ClipboardCopy>
                    </FlexItem>
                  </Flex>
                </FlexItem>
              )}

              {error && (
                <FlexItem>
                  <Alert variant={AlertVariant.danger} title="Error generating token" isInline>
                    {error}
                  </Alert>
                </FlexItem>
              )}
            </Flex>
          </FlexItem>
        </Flex>
      }
      onHidden={resetToken} // Reset token state when popover closes
    >
      <Button variant={ButtonVariant.link}>View</Button>
    </Popover>
  );
};

export default MaaSModelTableRowEndpoint;
