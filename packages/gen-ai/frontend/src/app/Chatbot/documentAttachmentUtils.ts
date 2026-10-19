export const getDocumentAttachmentTypeLabel = (filename: string): string => {
  const extension = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
  const labels: Record<string, string> = {
    pdf: 'PDF',
    txt: 'TXT',
    md: 'MD',
    csv: 'CSV',
    docx: 'DOC',
    pptx: 'PPT',
  };

  return labels[extension] ?? 'DOCUMENT';
};
