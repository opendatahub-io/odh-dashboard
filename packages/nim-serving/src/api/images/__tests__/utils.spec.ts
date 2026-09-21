import {
  normalizeVersion,
  getImageRepository,
  parseImageString,
  formatImageString,
} from '../utils';

describe('normalizeVersion', () => {
  it('should pad single number to three parts', () => {
    expect(normalizeVersion('1')).toBe('1.0.0');
  });

  it('should pad two-part version to three parts', () => {
    expect(normalizeVersion('1.2')).toBe('1.2.0');
  });

  it('should leave three-part version unchanged', () => {
    expect(normalizeVersion('1.2.3')).toBe('1.2.3');
  });

  it('should leave versions with more than three parts unchanged', () => {
    expect(normalizeVersion('1.2.3.4')).toBe('1.2.3.4');
  });

  it('should return non-numeric tags unchanged', () => {
    expect(normalizeVersion('latest')).toBe('latest');
  });

  it('should return tags with mixed content unchanged', () => {
    expect(normalizeVersion('v1.0.0')).toBe('v1.0.0');
  });
});

describe('getImageRepository', () => {
  it('should construct repository from namespace and model name', () => {
    expect(getImageRepository('nim/test', 'my-model')).toBe('nvcr.io/nim/test/my-model');
  });
});

describe('parseImageString', () => {
  it('should split host, namespace, name, and tag', () => {
    expect(parseImageString('nvcr.io/nim/snowflake/arctic-embed-l:1.0.1')).toEqual([
      'nvcr.io',
      'nim/snowflake',
      'arctic-embed-l',
      '1.0.1',
    ]);
  });

  it('should return an empty tag when none is present', () => {
    expect(parseImageString('nvcr.io/nim/meta/llama-3-8b-instruct')).toEqual([
      'nvcr.io',
      'nim/meta',
      'llama-3-8b-instruct',
      '',
    ]);
  });

  it('should keep a host port and not mistake it for a tag', () => {
    expect(parseImageString('mirror.local:5000/nim/arctic-embed-l')).toEqual([
      'mirror.local:5000',
      'nim',
      'arctic-embed-l',
      '',
    ]);
  });

  it('should read the tag alongside a host port', () => {
    expect(parseImageString('mirror.local:5000/nim/arctic-embed-l:1.0.1')).toEqual([
      'mirror.local:5000',
      'nim',
      'arctic-embed-l',
      '1.0.1',
    ]);
  });

  it('should treat a bare name with a tag as name and tag only', () => {
    expect(parseImageString('arctic-embed-l:1.0.1')).toEqual(['', '', 'arctic-embed-l', '1.0.1']);
  });

  it('should not treat a plain first segment as a host', () => {
    expect(parseImageString('nim/arctic-embed-l')).toEqual(['', 'nim', 'arctic-embed-l', '']);
  });
});

describe('formatImageString', () => {
  it('should join all parts into a full reference', () => {
    expect(formatImageString(['nvcr.io', 'nim/snowflake', 'arctic-embed-l', '1.0.1'])).toBe(
      'nvcr.io/nim/snowflake/arctic-embed-l:1.0.1',
    );
  });

  it('should omit the tag when it is empty', () => {
    expect(formatImageString(['nvcr.io', 'nim/snowflake', 'arctic-embed-l', ''])).toBe(
      'nvcr.io/nim/snowflake/arctic-embed-l',
    );
  });

  it('should drop empty host and namespace without leaving stray slashes', () => {
    expect(formatImageString(['', '', 'arctic-embed-l', '1.0.1'])).toBe('arctic-embed-l:1.0.1');
  });

  it('should round-trip a parsed reference', () => {
    const image = 'nvcr.io/nim/snowflake/arctic-embed-l:1.0.1';
    expect(formatImageString(parseImageString(image))).toBe(image);
  });
});
