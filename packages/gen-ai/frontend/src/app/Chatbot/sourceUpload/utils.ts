export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size}${sizes[i]}`;
};

export const simulateUploadProgress = (
  fileName: string,
  setFileProgress: React.Dispatch<React.SetStateAction<Record<string, number>>>,
): void => {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 20 + 10; // Random increment between 10-30%
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
    }
    setFileProgress((prev) => ({ ...prev, [fileName]: Math.round(progress) }));
  }, 200); // Update every 200ms
};

export const initializeFileProgress = (
  files: File[],
  setFileProgress: React.Dispatch<React.SetStateAction<Record<string, number>>>,
): void => {
  const initialProgress: Record<string, number> = {};
  files.forEach((file) => {
    initialProgress[file.name] = 0;
  });
  setFileProgress(initialProgress);

  // Simulate upload progress for each file
  files.forEach((file) => {
    simulateUploadProgress(file.name, setFileProgress);
  });
};
