import React from 'react';
import { Button, Flex, FlexItem, Progress, Label } from '@patternfly/react-core';
import {
  FileIcon,
  TimesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
} from '@patternfly/react-icons';
import { formatFileSize } from './utils';

type FileStatus = 'pending' | 'configured' | 'uploading' | 'uploaded' | 'failed';

type UploadedFileItemProps = {
  file: File;
  progress: number;
  status: FileStatus;
  onRemove: (fileName: string) => void;
};

export const UploadedFileItem: React.FC<UploadedFileItemProps> = ({
  file,
  progress,
  status,
  onRemove,
}) => {
  const fileSize = formatFileSize(file.size);

  const getStatusLabel = () => {
    switch (status) {
      case 'pending':
        return (
          <Label color="orange" icon={<ClockIcon />}>
            Awaiting settings
          </Label>
        );
      case 'configured':
        return (
          <Label color="blue" icon={<CheckCircleIcon />}>
            Configured
          </Label>
        );
      case 'uploading':
        return <Label color="blue">Uploading...</Label>;
      case 'uploaded':
        return (
          <Label color="green" icon={<CheckCircleIcon />}>
            Uploaded
          </Label>
        );
      case 'failed':
        return (
          <Label color="red" icon={<ExclamationTriangleIcon />}>
            Failed
          </Label>
        );
      default:
        return null;
    }
  };

  const getProgressVariant = () => {
    switch (status) {
      case 'uploaded':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return undefined;
    }
  };

  return (
    <div className="pf-v6-u-mt-md pf-v6-u-p-md pf-v6-u-border-bottom-1 pf-v6-u-border-color-200">
      <Flex
        justifyContent={{ default: 'justifyContentSpaceBetween' }}
        alignItems={{ default: 'alignItemsCenter' }}
        className="pf-v6-u-mb-sm"
      >
        <FlexItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <FileIcon className="pf-v6-u-mr-sm pf-v6-u-color-200" />
            </FlexItem>
            <FlexItem>
              <span className="pf-v6-u-font-weight-bold">{file.name}</span>
              <span className="pf-v6-u-ml-sm pf-v6-u-color-200">{fileSize}</span>
            </FlexItem>
          </Flex>
        </FlexItem>
        <FlexItem>
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{getStatusLabel()}</FlexItem>
            <FlexItem>
              <Button
                variant="plain"
                onClick={() => onRemove(file.name)}
                aria-label={`Remove ${file.name}`}
              >
                <TimesIcon />
              </Button>
            </FlexItem>
          </Flex>
        </FlexItem>
      </Flex>
      <Progress value={progress} variant={getProgressVariant()} className="pf-v6-u-mb-sm" />
    </div>
  );
};
