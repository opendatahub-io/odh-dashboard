import { EXECUTOR_ERROR_MAX_LENGTH_DEFAULT, extractExecutorLogError } from '../executorLogError';

/** Truncated reproduction of a real failed AutoRAG run's executor-logs-0 artifact. */
const TRACEBACK = `Traceback (most recent call last):
  File "<frozen runpy>", line 198, in _run_module_as_main
  File "<frozen runpy>", line 88, in _run_code
  File "/opt/app-root/lib64/python3.12/site-packages/kfp/dsl/executor_main.py", line 109, in <module>
    executor_main()
  File "/opt/app-root/lib64/python3.12/site-packages/kfp/dsl/executor_main.py", line 101, in executor_main
    output_file = executor.execute()
                  ^^^^^^^^^^^^^^^^^^
  File "/opt/app-root/lib64/python3.12/site-packages/kfp/dsl/executor.py", line 453, in execute
    result = self.func(**func_kwargs)
             ^^^^^^^^^^^^^^^^^^^^^^^^
  File "/tmp/tmp.SLxJN9Kh2V/ephemeral_component.py", line 146, in documents_discovery
    test_data_result = load_test_data(
                       ^^^^^^^^^^^^^^^
  File "/opt/app-root/lib64/python3.12/site-packages/ai4rag/utils/data/test_data_loader.py", line 87, in load_test_data
    benchmark_data = _parse_and_validate(raw_data)
                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/opt/app-root/lib64/python3.12/site-packages/ai4rag/utils/data/test_data_loader.py", line 143, in _parse_and_validate
    raise TestDataLoaderError(
ai4rag.utils.data.test_data_loader.TestDataLoaderError: Incorrect or incomplete keys in test data record at index 0. Each record must contain exactly: ['correct_answer_document_keys', 'correct_answers', 'question'].`;

const REAL_LOG = `[KFP Executor 2026-10-15 01:20:46,739 INFO]: Looking for component \`documents_discovery\` in --component_module_path \`/tmp/tmp.SLxJN9Kh2V/ephemeral_component.py\`
2026-10-15 01:20:53,314 - test-data-loader - INFO - Fetching test data from S3: bucket='ai-eng-canada', key='RH_Privacy_20260910T114722763Z.json'.
[KFP Executor 2026-10-15 01:20:53,215 INFO]: COMPONENT_STATUS component=documents_discovery stage=load_benchmark state=started
[KFP Executor 2026-10-15 01:20:53,447 INFO]: COMPONENT_STATUS component=documents_discovery stage=load_benchmark state=failed
[KFP Executor 2026-10-15 01:20:53,448 INFO]: COMPONENT_STATUS component=documents_discovery saved status with 1 stages to /s3/ai-eng-canada/documents-rag-optimization-pipeline/run-1/documents-discovery/0d709ceb-88b7-4e82-ab5b-ddc7d23da85b/component_status/component_status.json
${TRACEBACK}
`;

/** Launcher shutdown noise as seen in KFP launcher pod logs after a crash. */
const LAUNCHER_NOISE = `E1015 01:20:54.123456      1 launcher_v2.go:450] Component failed to execute successfully: exit status 1
time="2026-10-15T01:20:54Z" level=info msg="sub-process exited" argo=true
Error: exit status 1
`;

describe('extractExecutorLogError', () => {
  it('should return the traceback from a real executor log', () => {
    expect(extractExecutorLogError(REAL_LOG)).toBe(TRACEBACK);
  });

  it('should strip trailing launcher noise after the traceback', () => {
    expect(extractExecutorLogError(`${REAL_LOG}${LAUNCHER_NOISE}`)).toBe(TRACEBACK);
  });

  it('should handle CRLF line endings', () => {
    const crlfLog = REAL_LOG.replace(/\n/g, '\r\n');
    expect(extractExecutorLogError(crlfLog)).toBe(TRACEBACK);
  });

  it('should return undefined when the log has no traceback', () => {
    expect(extractExecutorLogError('[KFP Executor INFO]: everything is fine\n')).toBeUndefined();
  });

  it('should return undefined for an empty log', () => {
    expect(extractExecutorLogError('')).toBeUndefined();
  });

  it('should use the last traceback when several are present', () => {
    const log = `Traceback (most recent call last):
  File "first.py", line 1, in f
ValueError: first failure
[KFP Executor INFO]: retrying
Traceback (most recent call last):
  File "second.py", line 2, in g
RuntimeError: second failure
`;
    expect(extractExecutorLogError(log)).toBe(`Traceback (most recent call last):
  File "second.py", line 2, in g
RuntimeError: second failure`);
  });

  it('should preserve multi-line exception messages', () => {
    const log = `Traceback (most recent call last):
  File "x.py", line 1, in f
    raise ValueError(
ValueError: message line one
message line two
${LAUNCHER_NOISE}`;
    expect(extractExecutorLogError(log)).toBe(`Traceback (most recent call last):
  File "x.py", line 1, in f
    raise ValueError(
ValueError: message line one
message line two`);
  });

  it('should return undefined when only noise follows the marker', () => {
    expect(
      extractExecutorLogError(`Traceback (most recent call last):\n${LAUNCHER_NOISE}`),
    ).toBeUndefined();
  });

  it('should keep the tail with a truncation notice when the result exceeds the cap', () => {
    const longException = `Traceback (most recent call last):
  File "x.py", line 1, in f
ValueError: ${'x'.repeat(EXECUTOR_ERROR_MAX_LENGTH_DEFAULT + 500)}`;
    const result = extractExecutorLogError(longException);

    expect(result).toBeDefined();
    // The notice counts every dropped character — traceback header lines included.
    const omitted = longException.length - EXECUTOR_ERROR_MAX_LENGTH_DEFAULT;
    expect(result).toBe(
      `[... truncated ${omitted} earlier characters ...]\n${longException.slice(
        -EXECUTOR_ERROR_MAX_LENGTH_DEFAULT,
      )}`,
    );
    // The traceback header fell out of the kept window; the exception tail survived.
    expect(result?.includes('Traceback')).toBe(false);
    expect(result?.endsWith('x'.repeat(100))).toBe(true);
  });

  it('should honor a custom maxLength', () => {
    const log = `Traceback (most recent call last):
  File "x.py", line 1, in f
ValueError: ${'y'.repeat(300)}`;
    const result = extractExecutorLogError(log, { maxLength: 50 });

    expect(result?.endsWith('y'.repeat(50))).toBe(true);
    expect(result?.startsWith('[... truncated ')).toBe(true);
  });
});
