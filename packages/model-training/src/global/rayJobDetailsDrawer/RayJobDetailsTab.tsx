import * as React from 'react';
import {
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  ClipboardCopyButton,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Title,
  StackItem,
  Stack,
  Skeleton,
} from '@patternfly/react-core';
import { RayJobKind } from '../../k8sTypes';
import { useRayClusterSpec } from '../../hooks/useRayClusterSpec';

type RayJobDetailsTabProps = {
  job: RayJobKind;
};

const getShutdownPolicyLabel = (shutdownAfterJobFinishes?: boolean): string => {
  if (shutdownAfterJobFinishes) {
    return 'Cluster is deleted after job finishes';
  }
  return 'Cluster persists after job finishes';
};

const RayJobDetailsTab: React.FC<RayJobDetailsTabProps> = ({ job }) => {
  const [copied, setCopied] = React.useState(false);
  const rayClusterName = job.status?.rayClusterName || job.spec.clusterSelector?.['ray.io/cluster'];
  const { clusterSpec, loaded: clusterSpecLoaded } = useRayClusterSpec(job);
  const rayVersion = clusterSpec?.rayVersion;

  const handleCopy = React.useCallback(() => {
    if (job.spec.entrypoint) {
      navigator.clipboard.writeText(job.spec.entrypoint);
      setCopied(true);
    }
  }, [job.spec.entrypoint]);

  return (
    <Stack hasGutter>
      <StackItem className="pf-v6-u-mt-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h3" size="md" data-testid="job-summary-section">
            Job summary
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Ray version</DescriptionListTerm>
            {clusterSpecLoaded ? (
              <DescriptionListDescription data-testid="ray-version-value">
                {rayVersion ?? '-'}
              </DescriptionListDescription>
            ) : (
              <Skeleton width="80px" />
            )}
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>

      <StackItem className="pf-v6-u-mt-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h3" size="md" data-testid="executions-section">
            Executions
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Entrypoint command
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="entrypoint-command-value">
              {job.spec.entrypoint ? (
                <CodeBlock
                  actions={
                    <CodeBlockAction>
                      <ClipboardCopyButton
                        id="entrypoint-copy-button"
                        textId="entrypoint-code"
                        aria-label="Copy entrypoint command"
                        onClick={handleCopy}
                        exitDelay={copied ? 1500 : 600}
                        variant="plain"
                        onTooltipHidden={() => setCopied(false)}
                      >
                        {copied ? 'Successfully copied to clipboard!' : 'Copy to clipboard'}
                      </ClipboardCopyButton>
                    </CodeBlockAction>
                  }
                >
                  <CodeBlockCode id="entrypoint-code">{job.spec.entrypoint}</CodeBlockCode>
                </CodeBlock>
              ) : (
                '-'
              )}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Submission Mode
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="submission-mode-value">
              {job.spec.submissionMode ?? '-'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>

      <StackItem className="pf-v6-u-mt-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h3" size="md" data-testid="management-section">
            Management
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Shutdown Policy
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="shutdown-policy-value">
              {getShutdownPolicyLabel(job.spec.shutdownAfterJobFinishes)}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Cluster Name</DescriptionListTerm>
            <DescriptionListDescription data-testid="cluster-name-value">
              {rayClusterName ?? '-'}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
    </Stack>
  );
};

export default RayJobDetailsTab;
