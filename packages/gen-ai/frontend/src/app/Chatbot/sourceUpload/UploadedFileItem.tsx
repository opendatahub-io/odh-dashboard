import React from 'react';
import { Button, Divider, Grid, GridItem, Progress, ProgressVariant } from '@patternfly/react-core';
import { FileIcon, TimesIcon } from '@patternfly/react-icons';
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
  const title = `${file.name} (${fileSize})`;

  const getProgressVariant = () => {
    switch (status) {
      case 'uploaded':
        return ProgressVariant.success;
      case 'failed':
        return ProgressVariant.danger;
      default:
        return undefined;
    }
  };

  const getProgressValue = () => (status === 'uploaded' ? 100 : progress);

  return (
    <div>
      <div className="pf-v6-u-p-sm pf-v6-u-pt-md pf-v6-u-pb-md">
        <Grid hasGutter={false}>
          {/* First column: File icon */}
          <GridItem span={1}>
            <FileIcon className="pf-v6-u-color-200" />
          </GridItem>

          {/* Second column: Progress with file name and size in title */}
          <GridItem span={10} className="pf-v6-u-px-sm">
            <Progress value={getProgressValue()} title={title} variant={getProgressVariant()} />
          </GridItem>

          {/* Third column: Remove button */}
          <GridItem span={1} className="pf-v6-u-display-flex pf-v6-u-align-items-flex-start">
            <Button
              variant="plain"
              onClick={() => onRemove(file.name)}
              aria-label={`Remove ${file.name}`}
            >
              <TimesIcon />
            </Button>
          </GridItem>
        </Grid>
      </div>
      <Divider />
    </div>
  );
};
