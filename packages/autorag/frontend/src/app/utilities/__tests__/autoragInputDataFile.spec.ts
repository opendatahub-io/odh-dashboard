import type { FileRejection } from 'react-dropzone';
import {
  AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
  AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
} from '~/app/utilities/dropzoneFileUpload';
import {
  getInputDataDropRejectedNotification,
  INPUT_DATA_FILE_ACCEPT,
  INPUT_DATA_INVALID_FILE_TYPE_DESCRIPTION,
  INPUT_DATA_UPLOAD_NATIVE_ACCEPT,
  isAllowedInputDataUploadFile,
  SUPPORTED_FORMAT,
  SUPPORTED_FORMAT_EXTENSIONS,
  SUPPORTED_FORMAT_HINT,
  SUPPORTED_FORMAT_NAMES,
  SUPPORTED_FORMAT_NAMES_STRING_OR,
  SUPPORTED_FORMAT_NAMES_STRING_SIMPLE,
  SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION,
} from '~/app/utilities/autoragInputDataFile';

function rejection(file: File, errors: Array<{ code: string; message: string }>): FileRejection {
  return { file, errors };
}

describe('autoragInputDataFile', () => {
  describe('SUPPORTED_FORMAT', () => {
    it('contains all expected format keys', () => {
      const expected = [
        'pdf',
        'docx',
        'pptx',
        'md',
        'markdown',
        'html',
        'htm',
        'txt',
        'odt',
        'odp',
        'adoc',
        'tex',
        'epub',
        'eml',
        'msg',
        'qmd',
        'Rmd',
        'xhtml',
      ];
      expect(Object.keys(SUPPORTED_FORMAT)).toEqual(expected);
    });

    it.each(Object.entries(SUPPORTED_FORMAT))(
      '%s has id matching its key and a non-empty extension and name',
      (key, format) => {
        expect(format.id).toBe(key);
        expect(format.extension).toBe(key);
        expect(format.name.length).toBeGreaterThan(0);
      },
    );

    it.each(Object.entries(SUPPORTED_FORMAT))(
      '%s has either mimeType or mimeTypes but not both',
      (_key, format) => {
        const hasSingle = format.mimeType !== undefined;
        const hasMulti = format.mimeTypes !== undefined;
        expect(hasSingle || hasMulti).toBe(true);
        expect(hasSingle && hasMulti).toBe(false);
      },
    );

    it('formats with mimeTypes have at least one entry', () => {
      const multiMimeFormats = Object.values(SUPPORTED_FORMAT).filter((f) => f.mimeTypes);
      expect(multiMimeFormats.length).toBeGreaterThan(0);
      for (const f of multiMimeFormats) {
        expect(f.mimeTypes!.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe('derived constants', () => {
    it('SUPPORTED_FORMAT_EXTENSIONS lists every format extension', () => {
      expect(SUPPORTED_FORMAT_EXTENSIONS).toEqual(
        Object.values(SUPPORTED_FORMAT).map((f) => f.extension),
      );
    });

    it('SUPPORTED_FORMAT_NAMES is deduplicated', () => {
      expect(SUPPORTED_FORMAT_NAMES.length).toBe(new Set(SUPPORTED_FORMAT_NAMES).size);
      expect(SUPPORTED_FORMAT_NAMES).toContain('Markdown');
      expect(SUPPORTED_FORMAT_NAMES).toContain('HTML');
      expect(SUPPORTED_FORMAT_NAMES.filter((n) => n === 'Markdown')).toHaveLength(1);
      expect(SUPPORTED_FORMAT_NAMES.filter((n) => n === 'HTML')).toHaveLength(1);
    });

    it('SUPPORTED_FORMAT_NAMES_STRING_SIMPLE joins all names with commas', () => {
      expect(SUPPORTED_FORMAT_NAMES_STRING_SIMPLE).toBe(SUPPORTED_FORMAT_NAMES.join(', '));
    });

    it('SUPPORTED_FORMAT_NAMES_STRING_OR uses "or" before the last name', () => {
      const last = SUPPORTED_FORMAT_NAMES.at(-1);
      expect(SUPPORTED_FORMAT_NAMES_STRING_OR).toContain(`, or ${last}`);
      expect(SUPPORTED_FORMAT_NAMES_STRING_OR.endsWith(`, ${last}`)).toBe(false);
    });

    it('SUPPORTED_FORMAT_HINT includes the or-list', () => {
      expect(SUPPORTED_FORMAT_HINT).toBe(
        `You can only select ${SUPPORTED_FORMAT_NAMES_STRING_OR} files`,
      );
    });

    it('SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION groups extensions under shared MIME types', () => {
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['text/markdown']).toEqual(
        expect.arrayContaining(['.md', '.markdown', '.qmd']),
      );
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['text/html']).toEqual(
        expect.arrayContaining(['.html', '.htm']),
      );
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['text/plain']).toEqual(
        expect.arrayContaining(['.txt', '.adoc', '.qmd', '.Rmd']),
      );
    });

    it('SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION includes new format MIME types', () => {
      expect(
        SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['application/vnd.oasis.opendocument.text'],
      ).toEqual(['.odt']);
      expect(
        SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['application/vnd.oasis.opendocument.presentation'],
      ).toEqual(['.odp']);
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['text/asciidoc']).toEqual(['.adoc']);
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['text/x-tex']).toEqual(['.tex']);
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['application/x-tex']).toEqual(['.tex']);
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['application/epub+zip']).toEqual(['.epub']);
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['message/rfc822']).toEqual(['.eml']);
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['application/vnd.ms-outlook']).toEqual([
        '.msg',
      ]);
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['text/x-gfm']).toEqual(['.Rmd']);
      expect(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION['application/xhtml+xml']).toEqual(['.xhtml']);
    });

    it('INPUT_DATA_FILE_ACCEPT is the same object as SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION', () => {
      expect(INPUT_DATA_FILE_ACCEPT).toBe(SUPPORTED_FORMATS_MIME_TYPE_TO_EXTENSION);
    });

    it('INPUT_DATA_UPLOAD_NATIVE_ACCEPT is a comma-separated deduplicated list of extensions', () => {
      const extensions = INPUT_DATA_UPLOAD_NATIVE_ACCEPT.split(',');
      expect(extensions.length).toBe(new Set(extensions).size);
      for (const ext of extensions) {
        expect(ext).toMatch(/^\.\w+$/);
      }
    });

    it('INPUT_DATA_INVALID_FILE_TYPE_DESCRIPTION includes the simple name list', () => {
      expect(INPUT_DATA_INVALID_FILE_TYPE_DESCRIPTION).toBe(
        `File type must be one of the accepted types (${SUPPORTED_FORMAT_NAMES_STRING_SIMPLE}).`,
      );
    });
  });

  describe('isAllowedInputDataUploadFile', () => {
    it('allows PDF by extension even when MIME is generic', () => {
      expect(
        isAllowedInputDataUploadFile(
          new File(['%PDF'], 'doc.pdf', { type: 'application/octet-stream' }),
        ),
      ).toBe(true);
    });

    it('allows matching MIME when extension is missing', () => {
      expect(
        isAllowedInputDataUploadFile(new File(['hello'], 'notes', { type: 'text/plain' })),
      ).toBe(true);
    });

    it('rejects unknown extension and MIME', () => {
      expect(
        isAllowedInputDataUploadFile(
          new File(['x'], 'run.exe', { type: 'application/octet-stream' }),
        ),
      ).toBe(false);
    });

    it.each([
      ['document.odt', 'application/vnd.oasis.opendocument.text'],
      ['slides.odp', 'application/vnd.oasis.opendocument.presentation'],
      ['notes.adoc', 'text/asciidoc'],
      ['paper.tex', 'text/x-tex'],
      ['book.epub', 'application/epub+zip'],
      ['mail.eml', 'message/rfc822'],
      ['outlook.msg', 'application/vnd.ms-outlook'],
      ['quarto.qmd', 'text/markdown'],
      ['analysis.Rmd', 'text/x-gfm'],
      ['page.xhtml', 'application/xhtml+xml'],
    ])('allows new format %s with its MIME type', (filename, mimeType) => {
      expect(isAllowedInputDataUploadFile(new File(['x'], filename, { type: mimeType }))).toBe(
        true,
      );
    });

    it.each(['odt', 'odp', 'adoc', 'tex', 'epub', 'eml', 'msg', 'qmd', 'Rmd', 'xhtml'])(
      'allows .%s by extension even with octet-stream MIME',
      (ext) => {
        expect(
          isAllowedInputDataUploadFile(
            new File(['x'], `file.${ext}`, { type: 'application/octet-stream' }),
          ),
        ).toBe(true);
      },
    );

    it('matches extensions case-insensitively', () => {
      expect(
        isAllowedInputDataUploadFile(
          new File(['x'], 'PAPER.TEX', { type: 'application/octet-stream' }),
        ),
      ).toBe(true);
      expect(
        isAllowedInputDataUploadFile(
          new File(['x'], 'Doc.PDF', { type: 'application/octet-stream' }),
        ),
      ).toBe(true);
    });

    it('allows a multi-mimeType format via its secondary MIME type', () => {
      expect(
        isAllowedInputDataUploadFile(new File(['x'], 'paper', { type: 'application/x-tex' })),
      ).toBe(true);
    });

    it('rejects a file with no extension and no matching MIME', () => {
      expect(
        isAllowedInputDataUploadFile(
          new File(['x'], 'binary', { type: 'application/octet-stream' }),
        ),
      ).toBe(false);
    });

    it('rejects a file with no extension and empty MIME type', () => {
      expect(isAllowedInputDataUploadFile(new File(['x'], 'noext', { type: '' }))).toBe(false);
    });
  });

  describe('getInputDataDropRejectedNotification', () => {
    it('uses knowledge-document invalid type copy', () => {
      const file = new File(['x'], 'a.exe', { type: 'application/octet-stream' });
      expect(
        getInputDataDropRejectedNotification([
          rejection(file, [{ code: 'file-invalid-type', message: 'bad' }]),
        ]),
      ).toEqual({
        title: 'Invalid file type',
        description: INPUT_DATA_INVALID_FILE_TYPE_DESCRIPTION,
      });
    });

    it('uses shared too-large detail', () => {
      const file = new File(['x'], 'big.pdf', { type: 'application/pdf' });
      expect(
        getInputDataDropRejectedNotification([
          rejection(file, [{ code: 'file-too-large', message: 'too big' }]),
        ]),
      ).toEqual({
        title: 'File too large',
        description: AUTORAG_UPLOAD_TOO_LARGE_DETAIL,
      });
    });

    it('uses too-many-files detail', () => {
      const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });
      expect(
        getInputDataDropRejectedNotification([
          rejection(file, [{ code: 'too-many-files', message: 'too many' }]),
        ]),
      ).toEqual({
        title: 'Too many files',
        description: AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL,
      });
    });

    it('returns null for empty rejections', () => {
      expect(getInputDataDropRejectedNotification([])).toBeNull();
    });

    it('combines multiple known rejection codes into a single notification', () => {
      const result = getInputDataDropRejectedNotification([
        rejection(new File(['x'], 'a.exe', { type: 'application/octet-stream' }), [
          { code: 'file-invalid-type', message: 'bad type' },
        ]),
        rejection(new File(['x'], 'b.exe', { type: 'application/octet-stream' }), [
          { code: 'file-invalid-type', message: 'bad type' },
        ]),
      ]);
      expect(result).toEqual({
        title: 'File not accepted',
        description: expect.stringContaining(INPUT_DATA_INVALID_FILE_TYPE_DESCRIPTION),
      });
      expect(result!.description).toContain(AUTORAG_UPLOAD_TOO_MANY_FILES_DETAIL);
    });

    it('falls back to raw error message for unknown rejection codes', () => {
      const file = new File(['x'], 'mystery.bin', { type: 'application/octet-stream' });
      const result = getInputDataDropRejectedNotification([
        rejection(file, [{ code: 'custom-error', message: 'Something went wrong' }]),
      ]);
      expect(result).toEqual({
        title: 'File not accepted',
        description: 'Something went wrong',
      });
    });

    it('falls back to filename when unknown code has no message', () => {
      const file = new File(['x'], 'mystery.bin', { type: 'application/octet-stream' });
      const result = getInputDataDropRejectedNotification([
        rejection(file, [{ code: 'custom-error', message: '' }]),
      ]);
      expect(result).toEqual({
        title: 'File not accepted',
        description: '“mystery.bin” could not be added.',
      });
    });
  });
});
