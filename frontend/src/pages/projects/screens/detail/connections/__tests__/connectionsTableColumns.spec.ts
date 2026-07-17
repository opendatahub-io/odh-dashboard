import { mockConnection } from '#~/__mocks__/mockConnection';
import { mockConnectionTypeConfigMapObj } from '#~/__mocks__/mockConnectionType';
import {
  ConnectionTestStatus,
  CONNECTION_TEST_ANNOTATIONS,
} from '#~/concepts/connectionTypes/types';
import { getColumns } from '#~/pages/projects/screens/detail/connections/connectionsTableColumns';

describe('connectionsTableColumns', () => {
  describe('status column sort', () => {
    it('should use CONNECTION_TEST_ANNOTATIONS.STATUS for sorting', () => {
      const columns = getColumns(undefined, true);
      const statusColumn = columns.find((c) => c.field === 'status') ?? { sortable: undefined };
      expect(statusColumn).toBeDefined();
      expect(statusColumn.sortable).toBeInstanceOf(Function);

      const connA = mockConnection({ name: 'a' });
      connA.metadata.annotations = {
        ...connA.metadata.annotations,
        [CONNECTION_TEST_ANNOTATIONS.STATUS]: ConnectionTestStatus.VERIFIED,
      };
      const connB = mockConnection({ name: 'b' });
      connB.metadata.annotations = {
        ...connB.metadata.annotations,
        [CONNECTION_TEST_ANNOTATIONS.STATUS]: ConnectionTestStatus.FAILED,
      };

      const sortFn = statusColumn.sortable as (a: typeof connA, b: typeof connB) => number;
      const result = sortFn(connA, connB);
      expect(result).toBeGreaterThan(0);
    });

    it('should default to NOT_TESTED for connections missing status annotation', () => {
      const columns = getColumns(undefined, true);
      const statusColumn = columns.find((c) => c.field === 'status') ?? { sortable: undefined };
      const sortFn = statusColumn.sortable as (
        a: ReturnType<typeof mockConnection>,
        b: ReturnType<typeof mockConnection>,
      ) => number;

      const connWithStatus = mockConnection({ name: 'a' });
      connWithStatus.metadata.annotations = {
        ...connWithStatus.metadata.annotations,
        [CONNECTION_TEST_ANNOTATIONS.STATUS]: ConnectionTestStatus.NOT_TESTED,
      };
      const connWithoutStatus = mockConnection({ name: 'b' });

      const result = sortFn(connWithStatus, connWithoutStatus);
      expect(result).toBe(0);
    });

    it('should sort connections with status before connections without', () => {
      const columns = getColumns(undefined, true);
      const statusColumn = columns.find((c) => c.field === 'status') ?? { sortable: undefined };
      const sortFn = statusColumn.sortable as (
        a: ReturnType<typeof mockConnection>,
        b: ReturnType<typeof mockConnection>,
      ) => number;

      const connVerified = mockConnection({ name: 'a' });
      connVerified.metadata.annotations = {
        ...connVerified.metadata.annotations,
        [CONNECTION_TEST_ANNOTATIONS.STATUS]: ConnectionTestStatus.VERIFIED,
      };
      const connNoAnnotation = mockConnection({ name: 'b' });

      const result = sortFn(connVerified, connNoAnnotation);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('status column visibility', () => {
    it('should not include status column when showStatusColumn is false', () => {
      const columns = getColumns(undefined, false);
      expect(columns.find((c) => c.field === 'status')).toBeUndefined();
    });

    it('should not include status column by default', () => {
      const columns = getColumns();
      expect(columns.find((c) => c.field === 'status')).toBeUndefined();
    });

    it('should include status column when showStatusColumn is true', () => {
      const columns = getColumns(undefined, true);
      expect(columns.find((c) => c.field === 'status')).toBeDefined();
    });
  });

  describe('name column sort', () => {
    it('should sort by display name annotation', () => {
      const columns = getColumns();
      const nameColumn = columns.find((c) => c.field === 'name') ?? { sortable: undefined };
      expect(nameColumn).toBeDefined();

      const sortFn = nameColumn.sortable as (
        a: ReturnType<typeof mockConnection>,
        b: ReturnType<typeof mockConnection>,
      ) => number;
      const connA = mockConnection({ displayName: 'Alpha' });
      const connB = mockConnection({ displayName: 'Beta' });

      expect(sortFn(connA, connB)).toBeLessThan(0);
      expect(sortFn(connB, connA)).toBeGreaterThan(0);
    });
  });

  describe('type column sort', () => {
    it('should sort by connection type display name', () => {
      const connectionTypes = [
        mockConnectionTypeConfigMapObj({ name: 's3', displayName: 'S3 Buckets' }),
        mockConnectionTypeConfigMapObj({ name: 'postgres', displayName: 'PostgreSQL' }),
      ];
      const columns = getColumns(connectionTypes);
      const typeColumn = columns.find((c) => c.field === 'type') ?? { sortable: undefined };
      expect(typeColumn).toBeDefined();

      const sortFn = typeColumn.sortable as (
        a: ReturnType<typeof mockConnection>,
        b: ReturnType<typeof mockConnection>,
      ) => number;
      const connA = mockConnection({ connectionType: 'postgres' });
      const connB = mockConnection({ connectionType: 's3' });

      expect(sortFn(connA, connB)).toBeLessThan(0);
    });
  });
});
