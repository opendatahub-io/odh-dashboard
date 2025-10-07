import React from 'react';
import {
  Card,
  CardBody,
  CardTitle,
  Grid,
  GridItem,
  Button,
  Flex,
  FlexItem,
  Spinner,
  EmptyState,
  EmptyStateBody,
  Tooltip,
} from '@patternfly/react-core';
import { FileIcon, TimesIcon } from '@patternfly/react-icons';
import { FileModel } from '~/app/types';
import DeleteFileModal from './DeleteFileModal';

interface UploadedFilesListProps {
  files: FileModel[];
  isLoading: boolean;
  isDeleting: boolean;
  error: string | null;
  onDeleteFile: (fileId: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const formatDate = (timestamp: number): string => new Date(timestamp * 1000).toLocaleDateString();

const UploadedFilesList: React.FC<UploadedFilesListProps> = ({
  files,
  isLoading,
  isDeleting,
  error,
  onDeleteFile,
}) => {
  const [fileToDelete, setFileToDelete] = React.useState<FileModel | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  const handleDeleteClick = (file: FileModel) => {
    setFileToDelete(file);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (fileToDelete) {
      onDeleteFile(fileToDelete.id);
      setIsDeleteModalOpen(false);
      setFileToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setIsDeleteModalOpen(false);
    setFileToDelete(null);
  };
  if (isLoading) {
    return (
      <Card>
        <CardTitle>
          <Flex>
            <FlexItem>Uploaded files</FlexItem>
          </Flex>
        </CardTitle>
        <CardBody>
          <Flex justifyContent={{ default: 'justifyContentCenter' }}>
            <Spinner size="lg" />
          </Flex>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardTitle>
          <Flex>
            <FlexItem>Uploaded files</FlexItem>
          </Flex>
        </CardTitle>
        <CardBody>
          <EmptyState>
            <EmptyStateBody>
              <strong>Error loading files</strong>
              <br />
              {error}
            </EmptyStateBody>
          </EmptyState>
        </CardBody>
      </Card>
    );
  }

  // Don't render anything if there are no files
  if (files.length === 0) {
    return null;
  }

  return (
    <Card isPlain>
      <CardTitle>
        <Flex>
          <FlexItem>Uploaded files</FlexItem>
        </Flex>
      </CardTitle>
      <CardBody>
        <Grid hasGutter>
          {files.map((file) => (
            <React.Fragment key={file.id}>
              <GridItem span={1}>
                <FileIcon />
              </GridItem>
              <GridItem span={7}>
                <div className="pf-u-min-width-0">
                  <div
                    className="pf-u-font-weight-bold pf-u-word-break-word pf-u-font-size-md"
                    title={file.filename}
                  >
                    {file.filename}
                  </div>
                  <div className="pf-u-font-size-sm pf-u-color-200">
                    {formatFileSize(file.bytes)}
                  </div>
                </div>
              </GridItem>
              <GridItem span={3}>
                <div className="pf-u-font-size-sm pf-u-color-200">
                  {formatDate(file.created_at)}
                </div>
              </GridItem>
              <GridItem span={1}>
                <Tooltip content="Delete file">
                  <Button
                    variant="plain"
                    icon={<TimesIcon />}
                    onClick={() => handleDeleteClick(file)}
                    isDisabled={isDeleting}
                    aria-label={`Delete ${file.filename}`}
                    style={{ paddingTop: 0 }}
                    isDanger
                  />
                </Tooltip>
              </GridItem>
            </React.Fragment>
          ))}
        </Grid>
      </CardBody>
      <DeleteFileModal
        isOpen={isDeleteModalOpen}
        file={fileToDelete}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </Card>
  );
};

export default UploadedFilesList;
