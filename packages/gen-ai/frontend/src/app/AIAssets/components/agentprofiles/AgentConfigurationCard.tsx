import * as React from 'react';
import {
  Alert,
  Card,
  CardBody,
  CardTitle,
  Content,
  Flex,
  FlexItem,
  Label,
  LabelGroup,
} from '@patternfly/react-core';
import { AgentProfile } from '~/app/agentProfile/types';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';

type AgentConfigurationCardProps = {
  profile: AgentProfile;
  title: string;
  lastModified?: string;
  isSavedConfiguration?: boolean;
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
};

const AgentConfigurationCard: React.FC<AgentConfigurationCardProps> = ({
  profile,
  title,
  lastModified,
  isSavedConfiguration = false,
}) => {
  const tools = profile.spec.mcpServers ?? [];
  const vectorStoreIDs = (profile.spec.vectorStores?.stores ?? [])
    .map((store) => store.storeRef?.key ?? store.id)
    .filter((storeID): storeID is string => Boolean(storeID));
  const guardrailCount = profile.spec.guardrails?.length ?? 0;
  const guardrailsEnabled = useGuardrailsEnabled();

  return (
    <Card isFullHeight data-testid="agent-configuration-card">
      <CardTitle>
        <Flex justifyContent={{ default: 'justifyContentSpaceBetween' }}>
          <FlexItem>{title}</FlexItem>
          {lastModified && (
            <FlexItem>
              <Content component="small">Last modified {formatDate(lastModified)}</Content>
            </FlexItem>
          )}
        </Flex>
      </CardTitle>
      <CardBody>
        <dl className="pf-v6-u-m-0">
          <Flex component="div" className="pf-v6-u-mb-md">
            <FlexItem
              component="dt"
              className="pf-v6-u-font-weight-bold"
              style={{ minWidth: '11rem' }}
            >
              Model
            </FlexItem>
            <FlexItem component="dd" className="pf-v6-u-m-0">
              {profile.spec.model.id}
            </FlexItem>
          </Flex>
          {profile.spec.prompt && (
            <Flex component="div" className="pf-v6-u-mb-md">
              <FlexItem
                component="dt"
                className="pf-v6-u-font-weight-bold"
                style={{ minWidth: '11rem' }}
              >
                Prompt
              </FlexItem>
              <FlexItem component="dd" className="pf-v6-u-m-0">
                <LabelGroup>
                  <Label variant="outline">
                    {profile.spec.prompt.name}
                    {profile.spec.prompt.version && (
                      <Label isCompact color="grey" className="pf-v6-u-ml-xs">
                        v{profile.spec.prompt.version}
                      </Label>
                    )}
                  </Label>
                </LabelGroup>
              </FlexItem>
            </Flex>
          )}
          <Flex component="div" className="pf-v6-u-mb-md">
            <FlexItem
              component="dt"
              className="pf-v6-u-font-weight-bold"
              style={{ minWidth: '11rem' }}
            >
              Tools
            </FlexItem>
            <FlexItem component="dd" className="pf-v6-u-m-0">
              {tools.length > 0 ? (
                <Flex gap={{ default: 'gapSm' }}>
                  {tools.map((tool) => (
                    <FlexItem key={tool.serverRef.key ?? tool.serverRef.name}>
                      <Label isCompact>{tool.serverRef.key ?? tool.serverRef.name}</Label>
                    </FlexItem>
                  ))}
                </Flex>
              ) : (
                'No tools selected'
              )}
            </FlexItem>
          </Flex>
          <Flex component="div" className="pf-v6-u-mb-md">
            <FlexItem
              component="dt"
              className="pf-v6-u-font-weight-bold"
              style={{ minWidth: '11rem' }}
            >
              Knowledge
            </FlexItem>
            <FlexItem component="dd" className="pf-v6-u-m-0">
              {vectorStoreIDs.length > 0 ? (
                <Flex gap={{ default: 'gapSm' }}>
                  {vectorStoreIDs.map((storeID) => (
                    <FlexItem key={storeID}>
                      <Label isCompact>{storeID}</Label>
                    </FlexItem>
                  ))}
                </Flex>
              ) : (
                'No vector stores'
              )}
            </FlexItem>
          </Flex>
          {guardrailsEnabled && (
            <Flex component="div">
              <FlexItem
                component="dt"
                className="pf-v6-u-font-weight-bold"
                style={{ minWidth: '11rem' }}
              >
                Guardrails
              </FlexItem>
              <FlexItem component="dd" className="pf-v6-u-m-0">
                {isSavedConfiguration ? (
                  <Label isCompact color="grey">
                    Not saved
                  </Label>
                ) : (
                  `${guardrailCount} enabled`
                )}
              </FlexItem>
            </Flex>
          )}
        </dl>
        {isSavedConfiguration && guardrailsEnabled && (
          <Alert
            className="pf-v6-u-mt-lg"
            isInline
            isPlain
            variant="info"
            title="Guardrails are not included in saved configurations."
          />
        )}
      </CardBody>
    </Card>
  );
};

export default AgentConfigurationCard;
