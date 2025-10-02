import * as React from 'react';
import { listFiles, deleteFile } from '~/app/services/llamaStackService';
import { FileModel } from '~/app/types';
import { GenAiContext } from '~/app/context/GenAiContext';

export interface UseFileManagementReturn {
  files: FileModel[];
  isLoading: boolean;
  error: string | null;
  refreshFiles: () => Promise<void>;
  deleteFileById: (fileId: string) => Promise<void>;
  isDeleting: boolean;
}

interface UseFileManagementProps {
  onShowSuccessAlert?: () => void;
  onShowErrorAlert?: (message?: string) => void;
}

const useFileManagement = (props: UseFileManagementProps = {}): UseFileManagementReturn => {
  const { onShowSuccessAlert, onShowErrorAlert } = props;
  const { namespace } = React.useContext(GenAiContext);
  const [files, setFiles] = React.useState<FileModel[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refreshFiles = React.useCallback(async () => {
    if (!namespace?.name) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const fetchedFiles = await listFiles(namespace.name, 50, 'desc', 'assistants');
      setFiles(fetchedFiles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch files';
      setError(errorMessage);
      onShowErrorAlert?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [namespace, onShowErrorAlert]);

  const deleteFileById = React.useCallback(
    async (fileId: string) => {
      if (!namespace?.name) {
        return;
      }

      setIsDeleting(true);
      setError(null);

      try {
        await deleteFile(fileId, namespace.name);
        // Remove the deleted file from the local state
        setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
        onShowSuccessAlert?.();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete file';
        setError(errorMessage);
        onShowErrorAlert?.(errorMessage);
      } finally {
        setIsDeleting(false);
      }
    },
    [namespace, onShowSuccessAlert, onShowErrorAlert],
  );

  // Load files on mount and when namespace changes
  React.useEffect(() => {
    refreshFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace?.name]); // Only depend on namespace.name, not the entire refreshFiles function

  return {
    files,
    isLoading,
    error,
    refreshFiles,
    deleteFileById,
    isDeleting,
  };
};

export default useFileManagement;
