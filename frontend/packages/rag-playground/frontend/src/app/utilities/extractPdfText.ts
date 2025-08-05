import pdfToText from 'react-pdftotext';

/**
 * Extract text from a searchable PDF using only react-pdftotext.
 *
 * @param file - PDF file from input
 * @returns Extracted plain text
 */

export const extractTextFromFile = async (file?: File | Blob): Promise<string> => {
  if (!file) {
    throw new Error('No file provided.');
  }
  return pdfToText(file);
};
