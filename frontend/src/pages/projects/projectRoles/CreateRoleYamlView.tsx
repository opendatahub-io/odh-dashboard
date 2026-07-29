import * as React from 'react';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import { Language } from '@patternfly/react-code-editor';
import {
  CompressArrowsAltIcon,
  CopyIcon,
  DownloadIcon,
  ExpandArrowsAltIcon,
} from '@patternfly/react-icons';
import YAML from 'yaml';
import DashboardCodeEditor from '#~/concepts/dashboard/codeEditor/DashboardCodeEditor';
import { fireMiscTrackingEvent } from '#~/concepts/analyticsTracking/segmentIOUtils';
import { CUSTOM_ROLE_TRACKING_EVENTS } from './trackingUtils';
import assembleRole from './assembleRole';
import type { LabelEntry, RuleEntry } from './types';

type YamlExportAction = 'copy' | 'download';

type CreateRoleYamlViewProps = {
  namespace: string;
  k8sName: string;
  displayName: string;
  description: string;
  rules: RuleEntry[];
  labels: LabelEntry[];
  onExportAction?: (action: YamlExportAction) => void;
};

const CreateRoleYamlView: React.FC<CreateRoleYamlViewProps> = ({
  namespace,
  k8sName,
  displayName,
  description,
  rules,
  labels,
  onExportAction,
}) => {
  const [isFullScreen, setIsFullScreen] = React.useState(false);
  const editorContainerRef = React.useRef<HTMLDivElement>(null);

  const labelRecord = React.useMemo(
    () => Object.fromEntries(labels.filter((l) => l.key).map((l) => [l.key, l.value])),
    [labels],
  );

  const yamlContent = React.useMemo(() => {
    const role = assembleRole(
      namespace,
      k8sName,
      displayName || k8sName,
      description,
      rules,
      labelRecord,
    );
    return YAML.stringify(role);
  }, [namespace, k8sName, displayName, description, rules, labelRecord]);

  React.useEffect(() => {
    const container = editorContainerRef.current;
    const handleFullScreenChange = () => {
      setIsFullScreen(document.fullscreenElement === container);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
      if (document.fullscreenElement === container) {
        document.exitFullscreen();
      }
    };
  }, []);

  const onFullScreenToggle = () => {
    if (!isFullScreen) {
      editorContainerRef.current?.requestFullscreen();
    } else if (document.fullscreenElement === editorContainerRef.current) {
      document.exitFullscreen();
    }
  };

  const [copyTooltip, setCopyTooltip] = React.useState('Copy to clipboard');

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(yamlContent);
    } catch {
      setCopyTooltip('Unable to copy');
      setTimeout(() => setCopyTooltip('Copy to clipboard'), 2000);
      return;
    }
    setCopyTooltip('Copied!');
    setTimeout(() => setCopyTooltip('Copy to clipboard'), 2000);
    fireMiscTrackingEvent(CUSTOM_ROLE_TRACKING_EVENTS.YAML_EXPORT_SELECTED, {
      actionType: 'copy',
    });
    onExportAction?.('copy');
  }, [yamlContent, onExportAction]);

  const handleDownload = React.useCallback(
    (value: string, fileName: string) => {
      const blob = new Blob([value], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      fireMiscTrackingEvent(CUSTOM_ROLE_TRACKING_EVENTS.YAML_EXPORT_SELECTED, {
        actionType: 'download',
      });
      onExportAction?.('download');
    },
    [onExportAction],
  );

  const customControls = (
    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
      <FlexItem>
        <Tooltip content={copyTooltip} aria="none">
          <Button
            variant="plain"
            aria-label="Copy to clipboard"
            data-testid="yaml-copy-button"
            onClick={handleCopy}
            icon={<CopyIcon />}
          />
        </Tooltip>
      </FlexItem>
      <FlexItem>
        <Tooltip content="Download" aria="none">
          <Button
            variant="plain"
            aria-label="Download"
            data-testid="yaml-download-button"
            onClick={() => handleDownload(yamlContent, `${k8sName || 'untitled-role'}.yaml`)}
            icon={<DownloadIcon />}
          />
        </Tooltip>
      </FlexItem>
      <FlexItem>
        <Tooltip content={isFullScreen ? 'Exit full screen' : 'Full screen'} aria="none">
          <Button
            variant="plain"
            aria-label={isFullScreen ? 'Exit full screen' : 'Full screen'}
            data-testid="yaml-fullscreen-toggle"
            onClick={onFullScreenToggle}
            icon={isFullScreen ? <CompressArrowsAltIcon /> : <ExpandArrowsAltIcon />}
          />
        </Tooltip>
      </FlexItem>
      <FlexItem>
        <Content component="small">YAML (read-only)</Content>
      </FlexItem>
    </Flex>
  );

  return (
    <Stack hasGutter data-testid="create-role-yaml-view">
      <StackItem>
        <Title headingLevel="h2" size="md" data-testid="yaml-view-title">
          Role configuration YAML
        </Title>
      </StackItem>
      <StackItem>
        <Content component="p" data-testid="yaml-view-description">
          View the live, read-only YAML for this role. This preview automatically updates to reflect
          changes you make in <strong>Form</strong> view.
        </Content>
      </StackItem>
      <StackItem isFilled>
        {/* PF gap: no pf-v6-u-background-color-100 equivalent in v6 — remove when added */}
        <div
          ref={editorContainerRef}
          data-testid="yaml-editor-container"
          style={{ background: 'var(--pf-t--global--background--color--primary--default)' }}
        >
          <DashboardCodeEditor
            code={yamlContent}
            isReadOnly
            isLanguageLabelVisible
            language={Language.yaml}
            height={isFullScreen ? '100%' : undefined}
            codeEditorHeight={isFullScreen ? 'calc(100vh - 66px)' : '500px'}
            testId="yaml-code-editor"
            customControls={customControls}
          />
        </div>
      </StackItem>
    </Stack>
  );
};

export default CreateRoleYamlView;
