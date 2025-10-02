import React from 'react';
import { Divider, Grid, GridItem, Progress, ProgressVariant } from '@patternfly/react-core';
import { FileIcon } from '@patternfly/react-icons';
import { FileStatus } from '~/app/Chatbot/hooks/useSourceManagement';
import { formatFileSize } from './utils';

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

  // Auto-dismiss after 2 seconds when upload is successful
  React.useEffect(() => {
    if (status === 'uploaded') {
      const timer = setTimeout(() => {
        onRemove(file.name);
      }, 2000);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status, file.name, onRemove]);

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
          <GridItem span={11} className="pf-v6-u-px-sm">
            <Progress value={getProgressValue()} title={title} variant={getProgressVariant()} />
          </GridItem>
        </Grid>
      </div>
      <Divider />
    </div>
  );
};
