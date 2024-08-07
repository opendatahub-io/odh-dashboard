import {
  isS3PathValid,
  containsOnlySlashes,
  downloadString,
  removeLeadingSlash,
  replaceNonNumericPartWithString,
  replaceNumericPartWithString,
  containsMultipleSlashesPattern,
  triggerFileDownload,
} from '~/utilities/string';

global.URL.createObjectURL = jest.fn(() => 'test-url');

describe('downloadString', () => {
  it('should download a string as a file', () => {
    const createElementMock = jest.spyOn(document, 'createElement');
    const appendChildMock = jest.spyOn(document.body, 'appendChild');
    const removeChildMock = jest.spyOn(document.body, 'removeChild');

    downloadString('test.txt', 'test string');
    const linkElement = createElementMock.mock.results[0].value;

    expect(linkElement.download).toBe('test.txt');
    expect(linkElement.href).toBe('http://localhost/test-url');
    expect(createElementMock).toHaveBeenCalledTimes(1);
    expect(createElementMock).toHaveBeenCalledWith('a');
    expect(appendChildMock).toHaveBeenCalledTimes(1);
    expect(appendChildMock).toHaveBeenCalledWith(linkElement);
    expect(removeChildMock).toHaveBeenCalledTimes(1);
    expect(removeChildMock).toHaveBeenCalledWith(linkElement);
    expect(document.body.innerHTML).toBe('');
  });
});

describe('replaceNumericPartWithString', () => {
  it('should replace the numeric part of a string with a number', () => {
    expect(replaceNumericPartWithString('abc123xyz', 456)).toBe('abc456xyz');
  });

  it('should handle empty input string', () => {
    expect(replaceNumericPartWithString('', 789)).toBe('789');
  });

  it('should handle input string without numeric part', () => {
    expect(replaceNumericPartWithString('abcdef', 123)).toBe('123abcdef');
  });

  it('should handle numeric part at the beginning of the string', () => {
    expect(replaceNumericPartWithString('123xyz', 789)).toBe('789xyz');
  });

  it('should handle numeric part at the end of the string', () => {
    expect(replaceNumericPartWithString('abc456', 123)).toBe('abc123');
  });

  it('should handle Pipeline scheduled time', () => {
    expect(replaceNumericPartWithString('123Hour', 43424)).toBe('43424Hour');
  });

  it('should handle default Pipeline scheduled time', () => {
    expect(replaceNumericPartWithString('1Week', 26)).toBe('26Week');
  });
});

describe('replaceNonNumericPartWithString', () => {
  it('should replace the non-numeric part of a string with another string', () => {
    expect(replaceNonNumericPartWithString('abc123xyz', 'XYZ')).toBe('XYZ123xyz');
  });

  it('should handle empty input string', () => {
    expect(replaceNonNumericPartWithString('', 'XYZ')).toBe('XYZ');
  });

  it('should handle input string with no non-numeric part', () => {
    expect(replaceNonNumericPartWithString('123', 'XYZ')).toBe('123XYZ');
  });

  it('should handle input string with only non-numeric part', () => {
    expect(replaceNonNumericPartWithString('abc', 'XYZ')).toBe('XYZ');
  });

  it('should handle input string with multiple non-numeric parts', () => {
    expect(replaceNonNumericPartWithString('abc123def456', 'XYZ')).toBe('XYZ123def456');
  });

  it('should handle replacement string containing numbers', () => {
    expect(replaceNonNumericPartWithString('abc123xyz', '123')).toBe('123123xyz');
  });

  it('should handle replacement string containing special characters', () => {
    expect(replaceNonNumericPartWithString('abc123xyz', '@#$')).toBe('@#$123xyz');
  });

  it('should handle replacement string containing spaces', () => {
    expect(replaceNonNumericPartWithString('abc123xyz', '   ')).toBe('   123xyz');
  });

  it('should handle Pipeline scheduled time', () => {
    expect(replaceNonNumericPartWithString('123Week', 'Minute')).toBe('123Minute');
  });

  it('should handle default Pipeline scheduled time', () => {
    expect(replaceNonNumericPartWithString('1Week', 'Minute')).toBe('1Minute');
  });
});

describe('removeLeadingSlash', () => {
  it('removes leading slashes from a string if present', () => {
    expect(removeLeadingSlash('/example')).toBe('example');
    expect(removeLeadingSlash('//example')).toBe('/example');
    expect(removeLeadingSlash('//example/')).toBe('/example/');
    expect(removeLeadingSlash('///example')).toBe('//example');
  });

  it('does not modify string if it does not start with a slash', () => {
    expect(removeLeadingSlash('example')).toBe('example');
  });

  it('returns an empty string if input is an empty string', () => {
    expect(removeLeadingSlash('')).toBe('');
  });
});

describe('containsOnlySlashes', () => {
  it('returns true if string only contains slashes', () => {
    expect(containsOnlySlashes('/')).toBe(true);
    expect(containsOnlySlashes('///')).toBe(true);
  });

  it('returns false if string contains other words', () => {
    expect(containsOnlySlashes('/test')).toBe(false);
    expect(containsOnlySlashes('/test///')).toBe(false);
  });

  it('returns false if input string is an empty string', () => {
    expect(containsOnlySlashes('')).toBe(false);
  });
});

describe('containsMultipleSlashesPattern', () => {
  it('should return false if does not contain multiple slashes consecutively', () =>
    expect(containsMultipleSlashesPattern('/path')).toBe(false));

  it('should return true if contains multiple slashes consecutively', () =>
    expect(containsMultipleSlashesPattern('example//path')).toBe(true));

  it('should return true if contains more than two consecutive slashes', () =>
    expect(containsMultipleSlashesPattern('///path')).toBe(true));

  it('should return true if contains multiple slashes in different positions', () =>
    expect(containsMultipleSlashesPattern('/path//to//file')).toBe(true));

  it('should return false if is an empty string', () =>
    expect(containsMultipleSlashesPattern('')).toBe(false));

  it('should return false if contains no slashes', () =>
    expect(containsMultipleSlashesPattern('path')).toBe(false));
});

describe('isS3PathValid', () => {
  it('should return true for valid S3 path', () => {
    expect(isS3PathValid('folder/file.txt')).toBe(true);
  });

  it('should return true for valid S3 path with allowed special characters', () => {
    expect(isS3PathValid('my-folder/my_file-123.txt')).toBe(true);
  });

  it('should return false for invalid S3 path with unsupported characters', () => {
    expect(isS3PathValid('folder/*file.txt')).toBe(false);
  });

  it('should return false for invalid S3 path with spaces', () => {
    expect(isS3PathValid('folder/ file.txt')).toBe(false);
  });

  it('should return false for invalid S3 path with non-alphanumeric characters', () => {
    expect(isS3PathValid('folder/@file.txt')).toBe(false);
  });

  it('should return true for valid S3 path with uppercase letters', () => {
    expect(isS3PathValid('Folder/File.TXT')).toBe(true);
  });

  it('should return true for valid S3 path with trailing slash', () => {
    expect(isS3PathValid('folder/')).toBe(true);
  });

  it('should return true for valid S3 path with leading slash', () => {
    expect(isS3PathValid('/folder/file.txt')).toBe(true);
  });

  it('should return true for valid S3 path with hyphen', () => {
    expect(isS3PathValid('my-folder/my-file.txt')).toBe(true);
  });

  it('should return false when contains multiple slashes', () => {
    expect(isS3PathValid('folder//file.txt')).toBe(false);
  });
});

describe('triggerFileDownload', () => {
  it('should create an anchor element, set its attributes, append it to the document, trigger a click, and remove it', () => {
    const filename = 'test-file.txt';
    const href = 'https://example.com/test-file.txt';

    const createElementSpy = jest.spyOn(document, 'createElement');
    const appendChildSpy = jest
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node: Node) => node);
    const removeChildSpy = jest
      .spyOn(document.body, 'removeChild')
      .mockImplementation((node: Node) => node);

    const mockElement = document.createElement('a');

    const clickMock = jest.fn();
    mockElement.click = clickMock;

    createElementSpy.mockReturnValue(mockElement);

    triggerFileDownload(filename, href);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockElement.href).toBe(href);
    expect(mockElement.download).toBe(filename);
    expect(mockElement.target).toBe('_blank');
    expect(appendChildSpy).toHaveBeenCalledWith(mockElement);
    expect(clickMock).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalledWith(mockElement);

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });
});
