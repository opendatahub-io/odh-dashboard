import { ChatbotSourceSettings } from '~/app/types';

export const DEFAULT_SOURCE_SETTINGS: ChatbotSourceSettings = {
  embeddingModel: '',
  vectorStore: '',
  delimiter: '',
  maxChunkLength: 800,
  chunkOverlap: 400,
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {
    return '0 Bytes';
  }
  const k = 1024;
  const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const size = parseFloat((bytes / Math.pow(k, index)).toFixed(1));
  return `${size} ${units[index]}`;
};
