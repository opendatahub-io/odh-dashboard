export const genRandomChars = (len = 6): string =>
  Math.random()
    .toString(36)
    .replace(/[^a-z0-9]+/g, '')
    .substr(1, len);

export const downloadString = (filename: string, data: string): void => {
  const element = document.createElement('a');
  const file = new Blob([data], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};
