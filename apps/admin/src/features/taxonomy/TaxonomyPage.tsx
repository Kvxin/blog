import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Form, Input, Modal, Space, Tabs, Typography } from 'antd';
import { ResponsiveTable as Table } from '../../components/ResponsiveTable';
import { taxonomyInputSchema, type TaxonomyInput, type TaxonomyRecord, type PageResult } from '@blog/contracts';
import { request, errorMessage } from '../../lib/api-client';

export function TaxonomyPage() {
  return <>
    <Typography.Title level={2}>分类与标签</Typography.Title>
    <Alert type="info" showIcon title="每篇文章可选一个分类和多个标签"
      description="名称支持中文；URL 标识使用小写字母、数字和连字符，且在分类或标签内唯一。删除只解除关联，不删除文章。" style={{ marginBottom: 24 }} />
    <Tabs items={[
      { key: 'categories', label: '分类管理', children: <TaxonomyTable kind="categories" label="分类" /> },
      { key: 'tags', label: '标签管理', children: <TaxonomyTable kind="tags" label="标签" /> },
    ]} />
  </>;
}

function TaxonomyTable({ kind, label }: { kind: 'categories' | 'tags'; label: string }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<TaxonomyRecord | null | undefined>();
  const [form] = Form.useForm<TaxonomyInput>();
  const client = useQueryClient();
  const { message, modal } = App.useApp();
  const query = useQuery({ queryKey: ['taxonomy', kind, page, search], queryFn: () => request<PageResult<TaxonomyRecord>>(`/${kind}?${new URLSearchParams({ page: String(page), search })}`) });
  const invalidate = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['taxonomy', kind] }),
      client.invalidateQueries({ queryKey: ['taxonomy-options', kind] }),
      client.invalidateQueries({ queryKey: ['posts'] }),
      client.invalidateQueries({ queryKey: ['post'] }),
    ]);
  };
  const save = useMutation({ mutationFn: async (values: TaxonomyInput) => {
    const parsed = taxonomyInputSchema.safeParse(values);
    if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
    return request(editing ? `/${kind}/${editing.id}` : `/${kind}`, { method: editing ? 'PUT' : 'POST',
      body: editing ? { ...parsed.data, expectedUpdatedAt: editing.updatedAt } : parsed.data });
  }, onSuccess: async () => { setEditing(undefined); await invalidate(); message.success(`${label}已保存`); }, onError: (error) => message.error(errorMessage(error)) });
  const remove = useMutation({ mutationFn: (item: TaxonomyRecord) => request(`/${kind}/${item.id}`, { method: 'DELETE', body: { expectedUpdatedAt: item.updatedAt } }),
    onSuccess: async () => { await invalidate(); message.success(`${label}已删除，文章已保留`); }, onError: (error) => message.error(errorMessage(error)) });
  const open = (item: TaxonomyRecord | null) => { form.resetFields(); form.setFieldsValue(item ?? { name: '', slug: '' }); setEditing(item); };
  return <Card>
    <Space wrap className="list-toolbar" style={{ marginBottom: 20 }}>
      <Input.Search placeholder={`搜索${label}名称或标识`} allowClear onSearch={(value) => { setSearch(value); setPage(1); }} style={{ width: 280 }} />
      <Button type="primary" onClick={() => open(null)}>新建{label}</Button>
      <Button onClick={() => void query.refetch()}>刷新</Button>
    </Space>
    {query.isError && <Alert type="error" title={errorMessage(query.error)} style={{ marginBottom: 16 }} />}
    <Table<TaxonomyRecord> rowKey="id" dataSource={query.data?.items ?? []} loading={query.isFetching} scroll={{ x: 650 }}
      pagination={{ current: page, total: query.data?.total ?? 0, pageSize: 10, showSizeChanger: false, onChange: setPage }}
      columns={[
        { title: '名称', dataIndex: 'name' }, { title: 'URL 标识', dataIndex: 'slug' },
        { title: '关联文章', render: (_, item) => item._count.posts },
        { title: '更新时间', render: (_, item) => new Date(item.updatedAt).toLocaleString('zh-CN') },
        { title: '操作', render: (_, item) => <Space>
          <Button onClick={() => open(item)}>编辑</Button>
          <Button danger disabled={remove.isPending} onClick={() => modal.confirm({ title: `删除${label}「${item.name}」？`,
            content: `当前关联 ${item._count.posts} 篇文章。文章会保留，${label}关联将被解除，无法撤销。`,
            okText: '确认删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(item) })}>删除</Button>
        </Space> },
      ]} />
    <Modal title={`${editing ? '编辑' : '新建'}${label}`} open={editing !== undefined} onCancel={() => setEditing(undefined)}
      onOk={() => form.submit()} confirmLoading={save.isPending} okText="保存" cancelText="取消">
      <Form name={`taxonomy-${kind}`} form={form} layout="vertical" onFinish={(values) => save.mutate(values)}>
        <Form.Item name="name" label="名称" rules={[{ required: true, whitespace: true, message: '请输入名称' }]}><Input maxLength={80} /></Form.Item>
        <Form.Item name="slug" label="URL 标识" rules={[{ required: true }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: '使用小写字母、数字和连字符' }]}>
          <Input maxLength={120} placeholder="web-development" />
        </Form.Item>
      </Form>
    </Modal>
  </Card>;
}
