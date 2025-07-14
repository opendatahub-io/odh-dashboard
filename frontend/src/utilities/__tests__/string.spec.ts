import {
  isS3PathValid,
  containsOnlySlashes,
  downloadString,
  removeLeadingSlash,
  containsMultipleSlashesPattern,
  triggerFileDownload,
  joinWithCommaAnd,
} from '#~/utilities/string';

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

describe('joinWithCommaAnd', () => {
  it('should join items with comma and oxford comma', () => {
    expect(joinWithCommaAnd(['item1', 'item2', 'item3'])).toBe('item1, item2, and item3');
  });

  it('should join items with no comma if only two items', () => {
    expect(joinWithCommaAnd(['item1', 'item2'])).toBe('item1 and item2');
  });

  it('should join items with comma and with custom prefix and suffix', () => {
    expect(
      joinWithCommaAnd(['item1', 'item2', 'item3'], {
        singlePrefix: 'invalid',
        singleSuffix: 'invalid',
        multiPrefix: 'Prefix ',
        multiSuffix: ' suffix.',
      }),
    ).toBe('Prefix item1, item2, and item3 suffix.');
  });

  it('should join single item with custom prefix and suffix', () => {
    expect(
      joinWithCommaAnd(['item1'], {
        singlePrefix: 'Prefix ',
        singleSuffix: ' suffix.',
        multiPrefix: 'invalid',
        multiSuffix: 'invalid',
      }),
    ).toBe('Prefix item1 suffix.');
  });
});
