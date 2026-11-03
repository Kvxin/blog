import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Input, Select, Space, Tag, Typography } from 'antd';
import { ResponsiveTable as Table } from '../../components/ResponsiveTable';
import { useNavigate } from 'react-router-dom';
import type { PageResult, PostRecord } from '@blog/contracts';
import { request, errorMessage } from '../../lib/api-client';
import { TaxonomySelect } from '../taxonomy/TaxonomySelect';

export const statusLabels = { DRAFT: '草稿', PUBLISHED: '已发布（数据库）', ARCHIVED: '归档' };
export const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));
export function PostsPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const { message, modal } = App.useApp();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>();
  const [categoryId, setCategoryId] = useState<string>();
  const [tagId, setTagId] = useState<string>();
  const query = useQuery({ queryKey: ['posts', page, search, status, categoryId, tagId], queryFn: () => request<PageResult<PostRecord>>(`/posts?${new URLSearchParams({ page: String(page), search, ...(status ? { status } : {}), ...(categoryId ? { categoryId } : {}), ...(tagId ? { tagId } : {}) })}`) });
  const remove = useMutation({ mutationFn: (post: PostRecord) => request(`/posts/${post.id}`, { method: 'DELETE', body: { expectedUpdatedAt: post.updatedAt } }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['posts'] }); message.success('文章已删除'); },
    onError: (error) => message.error(errorMessage(error)) });
  const confirmDelete = (post: PostRecord) => modal.confirm({ title: `删除「${post.translations[0]?.title ?? post.translationKey}」？`,
    content: '会同时删除所有语言版本，无法撤销。', okText: '删除', cancelText: '取消', okButtonProps: { danger: true },
    onOk: () => remove.mutateAsync(post) });
  return <>
    <Typography.Title level={2}>文章管理</Typography.Title>
    <Typography.Paragraph type="secondary">管理文章、草稿与多语言版本。保存后到发布管理构建上线。</Typography.Paragraph>
    <Card>
      <Space wrap className="list-toolbar" style={{ marginBottom: 20 }}>
        <Input.Search placeholder="搜索标题或正文" allowClear onSearch={(value) => { setSearch(value); setPage(1); }} style={{ width: 260 }} />
        <Select placeholder="全部状态" allowClear options={statusOptions} style={{ width: 190 }} value={status} onChange={(value) => { setStatus(value); setPage(1); }} />
        <div style={{ width: 230 }}><TaxonomySelect kind="categories" value={categoryId} onChange={(value) => { setCategoryId(typeof value === 'string' ? value : undefined); setPage(1); }} /></div>
        <div style={{ width: 230 }}><TaxonomySelect kind="tags" value={tagId} onChange={(value) => { setTagId(typeof value === 'string' ? value : undefined); setPage(1); }} /></div>
        <Button type="primary" onClick={() => navigate('/posts/new')}>新建文章</Button>
        <Button onClick={() => void query.refetch()}>刷新</Button>
      </Space>
      {query.isError && <Alert type="error" title={errorMessage(query.error)} style={{ marginBottom: 16 }} />}
      <Table<PostRecord> rowKey="id" loading={query.isFetching} dataSource={query.data?.items ?? []} scroll={{ x: 800 }}
        pagination={{ current: page, total: query.data?.total ?? 0, pageSize: 10, showSizeChanger: false, onChange: setPage }}
        columns={[
          { title: '标题', render: (_, post) => <Button type="link" onClick={() => navigate(`/posts/${post.id}`)}>{post.translations[0]?.title}</Button> },
          { title: '标识', dataIndex: 'translationKey' },
          { title: '分类', render: (_, post) => post.category?.name ?? '未分类' },
          { title: '标签', render: (_, post) => post.tags.map((tag) => <Tag key={tag.id}>{tag.name}</Tag>) },
          { title: '语言', render: (_, post) => post.translations.map((translation) => <Tag key={translation.locale}>{translation.locale}</Tag>) },
          { title: '状态', render: (_, post) => <Tag color={post.status === 'PUBLISHED' ? 'green' : 'default'}>{statusLabels[post.status]}</Tag> },
          { title: '更新时间', render: (_, post) => new Date(post.updatedAt).toLocaleString('zh-CN') },
          { title: '操作', render: (_, post) => <Space><Button onClick={() => navigate(`/posts/${post.id}`)}>编辑</Button><Button danger disabled={remove.isPending} onClick={() => confirmDelete(post)}>删除</Button></Space> },
        ]} />
    </Card>
  </>;
}
