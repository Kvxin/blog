import type { ReactNode } from 'react';
import { Card, Empty, Pagination, Skeleton, Table as AntTable } from 'antd';
import type { TableProps } from 'antd';
import type { ColumnType } from 'antd/es/table';
import { useMobile } from '../lib/use-mobile';

// Desktop keeps the full table; mobile presents the same fields/actions as cards.
// Pagination and callbacks remain owned by the feature, avoiding a second data path.
export function ResponsiveTable<T extends { id: string }>(props: TableProps<T>) {
  const mobile = useMobile();
  if (!mobile) return <AntTable<T> {...props} />;
  const { dataSource = [], columns = [], loading, pagination } = props;
  const fields = columns as ColumnType<T>[];
  const busy = typeof loading === 'object' ? loading.spinning : loading;
  const value = (column: ColumnType<T>, record: T, index: number) => {
    const path = Array.isArray(column.dataIndex) ? column.dataIndex : column.dataIndex == null ? [] : [column.dataIndex];
    const raw = path.reduce<unknown>((data, key) => data == null ? undefined : (data as Record<string, unknown>)[String(key)], record);
    return (column.render ? column.render(raw, record, index) : raw) as ReactNode;
  };
  return <div className="mobile-record-list" aria-busy={!!busy}>
    {busy && dataSource.length === 0 ? <Skeleton active paragraph={{ rows: 4 }} /> : dataSource.length === 0 ? <Empty description="暂无数据" /> : dataSource.map((record, index) => (
      <Card key={record.id} size="small" className="mobile-record">
        <dl className="mobile-record-fields">
          {fields.map((column, i) => <div className="mobile-record-field" key={String(column.key ?? column.dataIndex ?? i)}>
            <dt>{column.title as ReactNode}</dt>
            <dd>{value(column, record, index) ?? '—'}</dd>
          </div>)}
        </dl>
      </Card>
    ))}
    {pagination && <Pagination {...pagination} size="small" responsive showLessItems style={{ marginTop: 16 }} />}
  </div>;
}
