import { describe, expect as assert, it } from '@jest/globals';
import { buildApiKeyUsageExample } from '@odh-dashboard/maas/utils/api-keys';
import { parseMaaSUsageExample } from '../maasApiKeyRevocation';

const validUsageExample = [
  'export API_KEY="secret-key"',
  'curl -X POST https://maas.example.com/model/v1/chat/completions \\',
  '  -H "Content-Type: application/json" \\',
  '  -H "Authorization: Bearer $API_KEY" \\',
  `  -d '{"model":"chat-model","messages":[{"role":"user","content":"Hello"}]}'`,
].join('\n');

describe('parseMaaSUsageExample', () => {
  it('parses the controlled request values from a portal usage example', () => {
    assert(parseMaaSUsageExample(validUsageExample)).toEqual({
      endpoint: 'https://maas.example.com/model/v1/chat/completions',
      apiKey: 'secret-key',
      requestBody: {
        model: 'chat-model',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    });
  });

  it('parses the quoted endpoint and API-key placeholder from a model endpoint example', () => {
    const modelEndpointExample = validUsageExample
      .replace('secret-key', '<your-api-key>')
      .replace(
        'https://maas.example.com/model/v1/chat/completions',
        "'https://maas.example.com/model/v1/chat/completions'",
      );

    assert(parseMaaSUsageExample(modelEndpointExample)).toMatchObject({
      endpoint: 'https://maas.example.com/model/v1/chat/completions',
      apiKey: '<your-api-key>',
    });
  });

  it('rejects additional shell commands', () => {
    assert(() => parseMaaSUsageExample(`${validUsageExample}\nrm -rf /tmp/example`)).toThrow(
      'unexpected command structure',
    );
  });

  it('rejects unsupported endpoint schemes', () => {
    assert(() => parseMaaSUsageExample(validUsageExample.replace('https://', 'file://'))).toThrow(
      'unsupported endpoint URL',
    );
  });

  it('rejects an unexpected authorization header', () => {
    assert(() =>
      parseMaaSUsageExample(validUsageExample.replace('$API_KEY', 'different-value')),
    ).toThrow('unexpected authorization header');
  });

  it('rejects unsupported request bodies', () => {
    assert(() =>
      parseMaaSUsageExample(
        validUsageExample.replace(
          '{"model":"chat-model","messages":[{"role":"user","content":"Hello"}]}',
          '{"model":"chat-model"}',
        ),
      ),
    ).toThrow('unsupported request body');
  });

  it('accepts --globoff in the curl command line', () => {
    const globoffExample = validUsageExample.replace(
      'curl -X POST https://maas.example.com/model/v1/chat/completions',
      "curl -X POST --globoff 'https://maas.example.com/model/v1/chat/completions'",
    );

    assert(parseMaaSUsageExample(globoffExample)).toMatchObject({
      endpoint: 'https://maas.example.com/model/v1/chat/completions',
      apiKey: 'secret-key',
    });
  });

  it('parses builder output end-to-end (producer-to-parser compatibility)', () => {
    const example = buildApiKeyUsageExample(
      'https://maas.example.com/model',
      'chat-model',
      'secret-key',
    );

    assert(parseMaaSUsageExample(example)).toEqual({
      endpoint: 'https://maas.example.com/model/v1/chat/completions',
      apiKey: 'secret-key',
      requestBody: {
        model: 'chat-model',
        messages: [{ role: 'user', content: 'Hello' }],
      },
    });
  });

  it("decodes the builder's POSIX single-quote escaping in the endpoint", () => {
    const example = buildApiKeyUsageExample(
      "https://gateway.example.com/it's",
      'chat-model',
      'secret-key',
    );

    assert(parseMaaSUsageExample(example)).toMatchObject({
      endpoint: "https://gateway.example.com/it's/v1/chat/completions",
    });
  });
});
