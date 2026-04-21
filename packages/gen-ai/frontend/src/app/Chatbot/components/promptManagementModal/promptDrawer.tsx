import React from 'react';
import {
  Button,
  DescriptionList,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionListDescription,
  Drawer,
  DrawerCloseButton,
  DrawerPanelContent,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerActions,
  TextArea,
  Spinner,
  Title,
  Flex,
  Timestamp,
  TimestampFormat,
  LabelGroup,
  Label,
} from '@patternfly/react-core';
import { CompressAltIcon } from '@patternfly/react-icons';
import SimpleSelect from '@odh-dashboard/internal/components/SimpleSelect';
import { MLflowPromptVersion } from '~/app/types';

export default function PromptDrawer({
  isLoadingDetails,
  selectedPromptVersions,
  selectedVersion,
  onVersionChange,
  onClose,
  children,
}: {
  isLoadingDetails: boolean;
  selectedPromptVersions: MLflowPromptVersion[];
  selectedVersion: number | null;
  onVersionChange: (version: number) => void;
  onClose: () => void;
  children: React.ReactNode;
}): React.ReactNode {
  const selectedPrompt = selectedPromptVersions.find((v) => v.version === selectedVersion);
  const isExpanded = !!selectedPrompt || isLoadingDetails;

  function buildContent() {
    if (isLoadingDetails) {
      return (
        <DrawerPanelContent data-testid="prompt-drawer-loading">
          <DrawerHead>
            <Title headingLevel="h3">Loading Prompt Details...</Title>
            <DrawerActions>
              <DrawerCloseButton onClick={onClose} />
            </DrawerActions>
          </DrawerHead>
          <Flex justifyContent={{ default: 'justifyContentCenter' }}>
            <Spinner aria-label="Loading Prompt Details" />
          </Flex>
        </DrawerPanelContent>
      );
    }
    if (!selectedPrompt) {
      return null;
    }
    const {
      name,
      version,
      template,
      messages,
      tags,
      commit_message: commitMessage,
      updated_at: updatedAt,
    } = selectedPrompt;

    const versionOptions = selectedPromptVersions.map((prompt) => ({
      key: String(prompt.version),
      label: `Version ${prompt.version}`,
    }));

    function onVersionSelect(key: string) {
      onVersionChange(Number(key));
    }
    return (
      <DrawerPanelContent data-testid="prompt-drawer-panel">
        <DrawerHead>
          <Title headingLevel="h2">{name}</Title>
          <DrawerActions>
            <Button
              data-testid="prompt-drawer-close"
              variant="plain"
              aria-label="Close drawer"
              onClick={onClose}
            >
              <CompressAltIcon />
            </Button>
          </DrawerActions>
        </DrawerHead>
        <Flex
          direction={{ default: 'column' }}
          style={{
            paddingLeft: 'var(--pf-t--global--spacer--md)',
            paddingRight: 'var(--pf-t--global--spacer--md)',
          }}
        >
          <SimpleSelect
            isScrollable
            options={versionOptions}
            value={String(version)}
            onChange={onVersionSelect}
            dataTestId="prompt-version-select"
          />
          <div>
            <TextArea
              data-testid="prompt-drawer-template"
              style={{ minHeight: '200px' }}
              resizeOrientation="vertical"
              aria-label="prompt template"
              value={template || messages?.find((m) => m.role === 'system')?.content}
              readOnlyVariant="default"
            />
          </div>
          <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '20ch' }}>
            <DescriptionListGroup>
              <DescriptionListTerm>Last Modified:</DescriptionListTerm>
              <DescriptionListDescription>
                <Timestamp
                  date={new Date(updatedAt)}
                  dateFormat={TimestampFormat.full}
                  style={{ fontSize: '14px' }}
                />
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Commit Message:</DescriptionListTerm>
              <DescriptionListDescription>{commitMessage}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Tags:</DescriptionListTerm>
              <DescriptionListDescription>
                <LabelGroup>
                  {Object.entries(tags ?? {}).map(([key, value]) => (
                    <Label variant="outline" key={key}>{`${key}: ${value}`}</Label>
                  ))}
                </LabelGroup>
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </Flex>
      </DrawerPanelContent>
    );
  }

  return (
    <Drawer isExpanded={isExpanded} isInline>
      <DrawerContent panelContent={buildContent()}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
}
