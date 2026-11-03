import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Select, Space } from 'antd';
import type { PageResult, TaxonomyRecord } from '@blog/contracts';
import { request } from '../../lib/api-client';

type OptionRecord = { id: string; name: string; slug: string };
export function TaxonomySelect({ kind, value, onChange, multiple, selected = [], id }: {
  kind: 'categories' | 'tags'; value?: string | string[] | null; onChange?: (value: string | string[] | null) => void;
  multiple?: boolean; selected?: OptionRecord[]; id?: string;
}) {
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['taxonomy-options', kind, search], queryFn: () => request<PageResult<TaxonomyRecord>>(`/${kind}?${new URLSearchParams({ pageSize: '100', search })}`) });
  const options = new Map<string, OptionRecord>();
  // Keep selected items visible even if outside the current search/page.
  selected.forEach((item) => options.set(item.id, item));
  query.data?.items.forEach((item) => options.set(item.id, item));
  return <Space orientation="vertical" className="full-width">
    <Select id={id} style={{ width: '100%' }} allowClear showSearch filterOption={false} onSearch={setSearch}
      mode={multiple ? 'multiple' : undefined} value={value ?? undefined} loading={query.isFetching}
      maxCount={multiple ? 50 : undefined} placeholder={multiple ? '选择标签，可搜索名称或标识' : '选择分类（可选）'}
      options={[...options.values()].map((item) => ({ value: item.id, label: `${item.name} (${item.slug})` }))}
      onChange={(next) => onChange?.(next ?? (multiple ? [] : null))} />
    {query.isError && <Alert type="error" title="无法加载分类或标签" action={<Button size="small" onClick={() => void query.refetch()}>重试</Button>} />}
  </Space>;
}
