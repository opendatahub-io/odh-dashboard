import { DatabaseSource, DatabaseType } from '#~/pages/modelRegistrySettings/const';
import { isValidPort, buildDatabaseSpec } from '#~/pages/modelRegistrySettings/utils';

describe('isValidPort', () => {
  it('should accept valid port numbers', () => {
    expect(isValidPort('1')).toBe(true);
    expect(isValidPort('80')).toBe(true);
    expect(isValidPort('443')).toBe(true);
    expect(isValidPort('3306')).toBe(true);
    expect(isValidPort('5432')).toBe(true);
    expect(isValidPort('8080')).toBe(true);
    expect(isValidPort('65535')).toBe(true);
  });

  it('should reject port numbers below 1', () => {
    expect(isValidPort('0')).toBe(false);
    expect(isValidPort('-1')).toBe(false);
    expect(isValidPort('-100')).toBe(false);
  });

  it('should reject port numbers above 65535', () => {
    expect(isValidPort('65536')).toBe(false);
    expect(isValidPort('70000')).toBe(false);
    expect(isValidPort('99999')).toBe(false);
  });

  it('should reject non-numeric values', () => {
    expect(isValidPort('abc')).toBe(false);
    expect(isValidPort('12abc')).toBe(false);
    expect(isValidPort('abc12')).toBe(false);
    expect(isValidPort('')).toBe(false);
    expect(isValidPort(' ')).toBe(false);
  });

  it('should reject decimal numbers', () => {
    expect(isValidPort('3.14')).toBe(false);
    expect(isValidPort('80.5')).toBe(false);
    expect(isValidPort('1234.5678')).toBe(false);
  });

  it('should reject special characters', () => {
    expect(isValidPort('80!')).toBe(false);
    expect(isValidPort('80@')).toBe(false);
    expect(isValidPort('80#')).toBe(false);
  });
});

describe('buildDatabaseSpec', () => {
  describe('default database configuration', () => {
    it('should build default PostgreSQL database spec with generateDeployment', () => {
      const spec = buildDatabaseSpec(DatabaseSource.DEFAULT, DatabaseType.POSTGRES);

      expect(spec.postgres).toEqual({
        generateDeployment: true,
      });
      expect(spec.mysql).toBeNull();
    });

    it('should build default database spec regardless of DatabaseType when using DEFAULT source', () => {
      // When using DEFAULT source, it always creates PostgreSQL with generateDeployment
      const mysqlSpec = buildDatabaseSpec(DatabaseSource.DEFAULT, DatabaseType.MYSQL);

      expect(mysqlSpec.postgres).toEqual({
        generateDeployment: true,
      });
      expect(mysqlSpec.mysql).toBeNull();
    });
  });

  describe('external database configuration', () => {
    const externalConfig = {
      host: 'db.example.com',
      port: 3306,
      database: 'model_registry',
      username: 'mlmduser',
    };

    it('should build external MySQL database spec', () => {
      const spec = buildDatabaseSpec(DatabaseSource.EXTERNAL, DatabaseType.MYSQL, externalConfig);

      expect(spec.mysql).toEqual({
        host: 'db.example.com',
        port: 3306,
        database: 'model_registry',
        username: 'mlmduser',
        skipDBCreation: false,
      });
      expect(spec.postgres).toBeNull();
    });

    it('should build external PostgreSQL database spec', () => {
      const postgresConfig = {
        host: 'postgres.example.com',
        port: 5432,
        database: 'model_registry_pg',
        username: 'postgres_user',
      };

      const spec = buildDatabaseSpec(
        DatabaseSource.EXTERNAL,
        DatabaseType.POSTGRES,
        postgresConfig,
      );

      expect(spec.postgres).toEqual({
        host: 'postgres.example.com',
        port: 5432,
        database: 'model_registry_pg',
        username: 'postgres_user',
        skipDBCreation: false,
      });
      expect(spec.mysql).toBeNull();
    });

    it('should handle different port numbers correctly', () => {
      const configWithCustomPort = {
        ...externalConfig,
        port: 13306,
      };

      const spec = buildDatabaseSpec(
        DatabaseSource.EXTERNAL,
        DatabaseType.MYSQL,
        configWithCustomPort,
      );

      expect(spec.mysql?.port).toBe(13306);
    });

    it('should always set skipDBCreation to false for external databases', () => {
      const mysqlSpec = buildDatabaseSpec(
        DatabaseSource.EXTERNAL,
        DatabaseType.MYSQL,
        externalConfig,
      );
      const postgresSpec = buildDatabaseSpec(
        DatabaseSource.EXTERNAL,
        DatabaseType.POSTGRES,
        externalConfig,
      );

      expect(mysqlSpec.mysql?.skipDBCreation).toBe(false);
      expect(postgresSpec.postgres?.skipDBCreation).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should throw error when config is missing for external database', () => {
      expect(() => {
        buildDatabaseSpec(DatabaseSource.EXTERNAL, DatabaseType.MYSQL);
      }).toThrow('External database configuration is required when using external database source');
    });

    it('should throw error when config is undefined for external database', () => {
      expect(() => {
        buildDatabaseSpec(DatabaseSource.EXTERNAL, DatabaseType.POSTGRES, undefined);
      }).toThrow('External database configuration is required when using external database source');
    });
  });

  describe('config validation', () => {
    it('should preserve all config fields in the spec', () => {
      const config = {
        host: 'test-host',
        port: 9999,
        database: 'test-db',
        username: 'test-user',
      };

      const spec = buildDatabaseSpec(DatabaseSource.EXTERNAL, DatabaseType.MYSQL, config);

      expect(spec.mysql?.host).toBe('test-host');
      expect(spec.mysql?.port).toBe(9999);
      expect(spec.mysql?.database).toBe('test-db');
      expect(spec.mysql?.username).toBe('test-user');
    });
  });
});
