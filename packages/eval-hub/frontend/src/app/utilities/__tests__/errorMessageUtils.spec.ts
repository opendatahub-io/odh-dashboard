import { parseEmbeddedErrorMessage } from '~/app/utilities/errorMessageUtils';

describe('parseEmbeddedErrorMessage', () => {
  it('should extract the message from an embedded JSON error body', () => {
    const message =
      'EvalHub error on operation GetInfo: {"message_code":"internal_server_error","message":"An internal server error occurred: \'Failed to list tenant hardware profiles\'.","trace":"6ea3c2e1-0cc8-4a51-8b30-56973561be19"}';

    expect(parseEmbeddedErrorMessage(message)).toBe(
      "An internal server error occurred: 'Failed to list tenant hardware profiles'.",
    );
  });

  it('should return the message unchanged when no JSON body is embedded', () => {
    const message = 'failed to connect to EvalHub server on operation GetInfo: dial tcp: refused';

    expect(parseEmbeddedErrorMessage(message)).toBe(message);
  });

  it('should return the message unchanged when the embedded text is not valid JSON', () => {
    const message = 'EvalHub error on operation GetInfo: {not json';

    expect(parseEmbeddedErrorMessage(message)).toBe(message);
  });

  it('should return the message unchanged when the parsed body has no message field', () => {
    const message = 'EvalHub error on operation GetInfo: {"message_code":"internal_server_error"}';

    expect(parseEmbeddedErrorMessage(message)).toBe(message);
  });

  it('should return the message unchanged when the embedded message is empty', () => {
    const message = 'EvalHub error on operation GetInfo: {"message":"  "}';

    expect(parseEmbeddedErrorMessage(message)).toBe(message);
  });

  it('should return the message unchanged when the embedded message is not a string', () => {
    const message = 'EvalHub error on operation GetInfo: {"message":42}';

    expect(parseEmbeddedErrorMessage(message)).toBe(message);
  });

  it('should return the message unchanged when the embedded value is an array', () => {
    const message = 'EvalHub error on operation GetInfo: ["a","b"]';

    expect(parseEmbeddedErrorMessage(message)).toBe(message);
  });

  it('should return malformed runtime inputs unchanged instead of throwing', () => {
    // The signature says string, but a non-Error rejection or a mutated Error
    // can smuggle anything past it at runtime.
    const call = (value: unknown): unknown => parseEmbeddedErrorMessage(value as string);

    expect(() => call(undefined)).not.toThrow();
    expect(call(undefined)).toBeUndefined();
    expect(call(null)).toBeNull();
    expect(call(42)).toBe(42);
    expect(call({ message: 'not a string input' })).toEqual({ message: 'not a string input' });
  });
});
