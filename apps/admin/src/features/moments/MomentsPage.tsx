import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Input, Select, Space, Tag, Typography } from 'antd';
import { ResponsiveTable as Table } from '../../components/ResponsiveTable';
import { useNavigate } from 'react-router-dom';
import type { PageResult, MomentRecord } from '@blog/contracts';
import { request, errorMessage } from '../../lib/api-client';
import { statusLabels, statusOptions } from '../posts/PostsPage';

export function MomentsPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { message, modal } = App.useApp();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const query = useQuery({ queryKey: ['moments', page, search, status], queryFn: () => request<PageResult<MomentRecord>>(`/moments?${new URLSearchParams({ page: String(page), search, ...(status ? { status } : {}) })}`) });
  const remove = useMutation({ mutationFn: (moment: MomentRecord) => request(`/moments/${moment.id}`, { method: 'DELETE', body: { expectedUpdatedAt: moment.updatedAt } }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['moments'] }); message.success('碎碎念已删除'); },
    onError: (error) => message.error(errorMessage(error)) });
  return <>
    <Typography.Title level={2}>碎碎念</Typography.Title>
    <Typography.Paragraph type="secondary">编辑短内容、语言、地点和配图 URL。</Typography.Paragraph>
    <Card>
      <Space wrap className="list-toolbar" style={{ marginBottom: 20 }}>
        <Input.Search placeholder="搜索内容" allowClear onSearch={(value) => { setSearch(value); setPage(1); }} style={{ width: 260 }} />
        <Select placeholder="全部状态" allowClear options={statusOptions} style={{ width: 190 }} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
        <Button type="primary" onClick={() => navigate('/moments/new')}>新建碎碎念</Button>
        <Button onClick={() => void query.refetch()}>刷新</Button>
      </Space>
      {query.isError && <Alert type="error" title={errorMessage(query.error)} style={{ marginBottom: 16 }} />}
      <Table<MomentRecord> rowKey="id" loading={query.isFetching} dataSource={query.data?.items ?? []} scroll={{ x: 800 }}
        pagination={{ current: page, total: query.data?.total ?? 0, pageSize: 10, showSizeChanger: false, onChange: setPage }}
        columns={[
          { title: '内容', render: (_, moment) => <Typography.Text>{moment.content.slice(0, 70)}</Typography.Text> },
          { title: '语言', dataIndex: 'locale' },
          { title: '状态', render: (_, moment) => <Tag>{statusLabels[moment.status]}</Tag> },
          { title: '更新时间', render: (_, moment) => new Date(moment.updatedAt).toLocaleString('zh-CN') },
          { title: '操作', render: (_, moment) => <Space>
            <Button onClick={() => navigate(`/moments/${moment.id}`)}>编辑</Button>
            <Button danger disabled={remove.isPending} onClick={() => modal.confirm({ title: '删除这条碎碎念？', content: '删除后无法撤销。', okText: '删除', cancelText: '取消', okButtonProps: { danger: true }, onOk: () => remove.mutateAsync(moment) })}>删除</Button>
          </Space> },
        ]} />
    </Card>
  </>;
}
