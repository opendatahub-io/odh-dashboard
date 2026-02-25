import React from 'react';
import {
  DescriptionList,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionListDescription,
  Drawer,
  DrawerPanelContent,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerActions,
  DrawerCloseButton,
  TextArea,
  Title,
  Flex,
  Timestamp,
  TimestampFormat,
  LabelGroup,
  Label,
} from '@patternfly/react-core';
import { SimpleSelect } from '@patternfly/react-templates';
import { MLflowPromptVersion } from '~/app/types';

export default function PromptDrawer({
  selectedPromptVersions,
  selectedVersion,
  onVersionChange,
  onClose,
  children,
}: {
  selectedPromptVersions: MLflowPromptVersion[];
  selectedVersion: number | null;
  onVersionChange: (version: number) => void;
  onClose: () => void;
  children: React.ReactNode;
}): React.ReactNode {
  const selectedPrompt = selectedPromptVersions.find((v) => v.version === selectedVersion);
  const isExpanded = !!selectedPrompt;

  function buildContent() {
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
      value: prompt.version,
      content: `Version ${prompt.version.toString()}`,
    }));

    const initialOptions = versionOptions.map((o) => ({
      ...o,
      selected: o.value === version,
    }));

    function onVersionSelect(_: React.MouseEvent, selection: string | number) {
      onVersionChange(Number(selection));
    }
    return (
      <DrawerPanelContent>
        <DrawerHead>
          <Title headingLevel="h2">{name}</Title>
          <DrawerActions>
            <DrawerCloseButton onClick={onClose} />
          </DrawerActions>
        </DrawerHead>
        <Flex
          direction={{ default: 'column' }}
          style={{
            paddingLeft: 'var(--pf-t--global--spacer--md)',
            paddingRight: 'var(--pf-t--global--spacer--md)',
          }}
        >
          <SimpleSelect initialOptions={initialOptions} onSelect={onVersionSelect} />
          <div>
            <TextArea
              style={{ minHeight: '200px' }}
              resizeOrientation="vertical"
              aria-label="prompt template"
              value={JSON.stringify(
                template || messages?.find((m) => m.role === 'system')?.content,
                null,
                2,
              )}
              readOnlyVariant="default"
            />
          </div>
          <DescriptionList isHorizontal horizontalTermWidthModifier={{ default: '20ch' }}>
            <DescriptionListGroup>
              <DescriptionListTerm>Last Modified:</DescriptionListTerm>
              <DescriptionListDescription>
                <Timestamp date={new Date(updatedAt)} dateFormat={TimestampFormat.full} />
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
