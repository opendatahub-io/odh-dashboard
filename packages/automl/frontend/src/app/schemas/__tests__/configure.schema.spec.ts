/* eslint-disable camelcase */
import {
  TASK_TYPE_BINARY,
  TASK_TYPE_MULTICLASS,
  TASK_TYPE_REGRESSION,
  TASK_TYPE_TIMESERIES,
} from '~/app/utilities/const';
import { createConfigureSchema, TASK_TYPES } from '~/app/schemas/configure.schema';

describe('createConfigureSchema', () => {
  const schema = createConfigureSchema();

  describe('defaults', () => {
    it('should have an empty task_type by default', () => {
      expect(schema.defaults.task_type).toBe('');
    });

    it('should not default to any valid prediction type', () => {
      const validTypes: string[] = [...TASK_TYPES];
      expect(validTypes).not.toContain(schema.defaults.task_type);
    });
  });

  describe('validation', () => {
    it('should reject empty task_type on submit', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        target_column: 'col1',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid task_type values', () => {
      const baseData = {
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        target_column: 'col1',
      };

      for (const taskType of [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION]) {
        const result = schema.full.safeParse({ ...baseData, task_type: taskType });
        expect(result.success).toBe(true);
      }
    });

    it('should accept timeseries with required timeseries fields', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_TIMESERIES,
        target_column: 'target_col',
        id_column: 'id_col',
        timestamp_column: 'ts_col',
      });
      expect(result.success).toBe(true);
    });

    it('should require target_column for all task types', () => {
      for (const taskType of TASK_TYPES) {
        const data: Record<string, unknown> = {
          ...schema.defaults,
          display_name: 'test',
          train_data_secret_name: 'secret',
          train_data_bucket_name: 'bucket',
          train_data_file_key: 'file.csv',
          task_type: taskType,
        };
        if (taskType === TASK_TYPE_TIMESERIES) {
          data.id_column = 'id_col';
          data.timestamp_column = 'ts_col';
        }
        const result = schema.full.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.error.issues.map((i) => i.path.join('.'));
          expect(paths).toContain('target_column');
        }
      }
    });

    it('should reject whitespace-only target_column for all task types', () => {
      for (const taskType of TASK_TYPES) {
        const data: Record<string, unknown> = {
          ...schema.defaults,
          display_name: 'test',
          train_data_secret_name: 'secret',
          train_data_bucket_name: 'bucket',
          train_data_file_key: 'file.csv',
          task_type: taskType,
          target_column: '   ',
        };
        if (taskType === TASK_TYPE_TIMESERIES) {
          data.id_column = 'id_col';
          data.timestamp_column = 'ts_col';
        }
        const result = schema.full.safeParse(data);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.error.issues.map((i) => i.path.join('.'));
          expect(paths).toContain('target_column');
        }
      }
    });

    it('should not require target_column when task_type is empty', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
      });
      // Should fail because task_type is invalid (empty), NOT because target_column is missing
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('task_type');
        expect(paths).not.toContain('target_column');
      }
    });

    it('should reject target_column equal to timestamp_column for timeseries', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_TIMESERIES,
        target_column: 'same_col',
        id_column: 'id_col',
        timestamp_column: 'same_col',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const targetIssues = result.error.issues.filter(
          (i) => i.path.join('.') === 'target_column',
        );
        expect(targetIssues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: 'Target column must be different from timestamp column',
            }),
          ]),
        );
      }
    });

    it('should reject target_column equal to id_column for timeseries', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_TIMESERIES,
        target_column: 'same_col',
        id_column: 'same_col',
        timestamp_column: 'ts_col',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const targetIssues = result.error.issues.filter(
          (i) => i.path.join('.') === 'target_column',
        );
        expect(targetIssues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: 'Target column must be different from ID column',
            }),
          ]),
        );
      }
    });

    it('should reject target_column included in known_covariates_names for timeseries', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_TIMESERIES,
        target_column: 'target_col',
        id_column: 'id_col',
        timestamp_column: 'ts_col',
        known_covariates_names: ['covar1', 'target_col', 'covar2'],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const targetIssues = result.error.issues.filter(
          (i) => i.path.join('.') === 'target_column',
        );
        expect(targetIssues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: 'Target column must not be included in known covariates',
            }),
          ]),
        );
      }
    });

    it('should accept display_name at max length (250 Unicode characters)', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'a'.repeat(250),
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_BINARY,
        target_column: 'col1',
      });
      expect(result.success).toBe(true);
    });

    it('should reject display_name exceeding max length (251 Unicode characters)', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'a'.repeat(251),
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_BINARY,
        target_column: 'col1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('display_name');
      }
    });

    it('should accept display_name with 250 emoji characters (proper Unicode counting)', () => {
      // 250 emojis = 250 Unicode code points
      // JavaScript .length would count this as 500 (each emoji is 2 UTF-16 code units)
      // Array.from().length correctly counts as 250 Unicode characters
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: '😀'.repeat(250),
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_BINARY,
        target_column: 'col1',
      });
      expect(result.success).toBe(true);
    });

    it('should reject display_name with 251 emoji characters', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: '😀'.repeat(251),
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_BINARY,
        target_column: 'col1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('display_name');
      }
    });

    it('should accept display_name with 250 multi-byte characters', () => {
      // The limit is character-based (MySQL varchar(256) counts characters, not bytes).
      // 250 × 'é' (U+00E9) = 250 characters but 500 bytes in UTF-8.
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'é'.repeat(250),
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_BINARY,
        target_column: 'col1',
      });
      expect(result.success).toBe(true);
    });

    it('should reject display_name with 251 multi-byte characters', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'é'.repeat(251),
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_BINARY,
        target_column: 'col1',
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map((i) => i.path.join('.'));
        expect(paths).toContain('display_name');
      }
    });

    it('should reject invalid task_type values', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: 'invalid',
        target_column: 'col1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('top_n validation', () => {
    it('should accept top_n at maximum for tabular task types', () => {
      const baseData = {
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        target_column: 'col1',
        top_n: 10,
      };

      for (const taskType of [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION]) {
        const result = schema.full.safeParse({ ...baseData, task_type: taskType });
        expect(result.success).toBe(true);
      }
    });

    it('should reject top_n exceeding maximum for tabular task types', () => {
      const baseData = {
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        target_column: 'col1',
        top_n: 11,
      };

      for (const taskType of [TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS, TASK_TYPE_REGRESSION]) {
        const result = schema.full.safeParse({ ...baseData, task_type: taskType });
        expect(result.success).toBe(false);
        if (!result.success) {
          const topNIssue = result.error.issues.find((i) => i.path.includes('top_n'));
          expect(topNIssue).toBeDefined();
          expect(topNIssue?.message).toContain('10');
        }
      }
    });

    it('should accept top_n at maximum for timeseries task type', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_TIMESERIES,
        target_column: 'target_col',
        id_column: 'id_col',
        timestamp_column: 'ts_col',
        top_n: 7,
      });
      expect(result.success).toBe(true);
    });

    it('should reject top_n exceeding maximum for timeseries task type', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_TIMESERIES,
        target_column: 'target_col',
        id_column: 'id_col',
        timestamp_column: 'ts_col',
        top_n: 8,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const topNIssue = result.error.issues.find((i) => i.path.includes('top_n'));
        expect(topNIssue).toBeDefined();
        expect(topNIssue?.message).toContain('7');
      }
    });

    it('should reject top_n below minimum', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_BINARY,
        target_column: 'col1',
        top_n: 0,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const topNIssue = result.error.issues.find((i) => i.path.includes('top_n'));
        expect(topNIssue).toBeDefined();
        expect(topNIssue?.message).toContain('Minimum');
      }
    });
  });

  describe('transformers', () => {
    it('should map target_column to label_column for tabular task types', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_BINARY,
        target_column: 'my_label',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.label_column).toBe('my_label');
        expect(result.data).not.toHaveProperty('target_column');
        expect(result.data).not.toHaveProperty('target');
        expect(result.data).not.toHaveProperty('id_column');
        expect(result.data).not.toHaveProperty('timestamp_column');
        expect(result.data).not.toHaveProperty('prediction_length');
        expect(result.data).not.toHaveProperty('known_covariates_names');
      }
    });

    it('should map target_column to target for timeseries task type', () => {
      const result = schema.full.safeParse({
        ...schema.defaults,
        display_name: 'test',
        train_data_secret_name: 'secret',
        train_data_bucket_name: 'bucket',
        train_data_file_key: 'file.csv',
        task_type: TASK_TYPE_TIMESERIES,
        target_column: 'forecast_val',
        id_column: 'id_col',
        timestamp_column: 'ts_col',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.target).toBe('forecast_val');
        expect(result.data).not.toHaveProperty('target_column');
        expect(result.data).not.toHaveProperty('label_column');
      }
    });
  });
});
