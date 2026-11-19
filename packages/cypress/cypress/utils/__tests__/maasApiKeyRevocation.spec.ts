import { describe, expect as assert, it } from '@jest/globals';
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
});
