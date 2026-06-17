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
import { CompressArrowsAltIcon } from '@patternfly/react-icons/dist/esm/icons/compress-arrows-alt-icon';
import { ExpandArrowsAltIcon } from '@patternfly/react-icons/dist/esm/icons/expand-arrows-alt-icon';
import YAML from 'yaml';
import DashboardCodeEditor from '#~/concepts/dashboard/codeEditor/DashboardCodeEditor';
import assembleRole from './assembleRole';
import type { LabelEntry, RuleEntry } from './types';

type CreateRoleYamlViewProps = {
  namespace: string;
  k8sName: string;
  displayName: string;
  description: string;
  rules: RuleEntry[];
  labels: LabelEntry[];
};

const CreateRoleYamlView: React.FC<CreateRoleYamlViewProps> = ({
  namespace,
  k8sName,
  displayName,
  description,
  rules,
  labels,
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
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  const onFullScreenToggle = () => {
    if (!isFullScreen) {
      editorContainerRef.current?.requestFullscreen();
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const customControls = (
    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
      <FlexItem>
        <Tooltip content={isFullScreen ? 'Exit full screen' : 'Full screen'}>
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
        <div
          ref={editorContainerRef}
          data-testid="yaml-editor-container"
          style={{ background: 'var(--pf-t--global--background--color--primary--default)' }}
        >
          <DashboardCodeEditor
            code={yamlContent}
            isReadOnly
            isLanguageLabelVisible
            isCopyEnabled
            isDownloadEnabled
            downloadFileName={`${k8sName || 'untitled-role'}.yaml`}
            language={Language.yaml}
            codeEditorHeight={isFullScreen ? '100vh' : '500px'}
            testId="yaml-code-editor"
            customControls={customControls}
          />
        </div>
      </StackItem>
    </Stack>
  );
};

export default CreateRoleYamlView;
