import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Descriptions, Drawer, Form, Input, Modal, Space, Tag, Typography } from 'antd';
import { ResponsiveTable as Table } from '../../components/ResponsiveTable';
import { useMobile } from '../../lib/use-mobile';
import type { PageResult, PublishJobRecord, PublishingOverview } from '@blog/contracts';
import { request, errorMessage } from '../../lib/api-client';

const labels = { QUEUED: '等待中', RUNNING: '构建中', SUCCEEDED: '发布成功', FAILED: '发布失败' };
const colors = { QUEUED: 'default', RUNNING: 'processing', SUCCEEDED: 'success', FAILED: 'error' };
const time = (value: string | null) => value ? new Date(value).toLocaleString('zh-CN') : '—';
export function PublishingPage() {
  const mobile = useMobile();
  const client = useQueryClient();
  const { message } = App.useApp();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [form] = Form.useForm<{ remark: string }>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string>();
  const overview = useQuery({ queryKey: ['publishing-overview'], queryFn: () => request<PublishingOverview>('/publishing/overview'), refetchInterval: 3000 });
  const jobs = useQuery({ queryKey: ['publish-jobs', page], queryFn: () => request<PageResult<PublishJobRecord>>(`/publishing/jobs?page=${page}`), refetchInterval: overview.data?.activeJob ? 2000 : false });
  const detail = useQuery({ queryKey: ['publish-job', selected], queryFn: () => request<PublishJobRecord>(`/publishing/jobs/${selected}`), enabled: !!selected,
    refetchInterval: (query) => ['QUEUED', 'RUNNING'].includes(query.state.data?.status ?? '') ? 1000 : false });
  const publish = useMutation({ mutationFn: (values: { remark: string }) => request<PublishJobRecord>('/publishing/jobs', { method: 'POST', body: values }),
    onSuccess: async (job) => { setConfirmOpen(false); form.resetFields(); setSelected(job.id); setPage(1); await Promise.all([client.invalidateQueries({ queryKey: ['publish-jobs'] }), client.invalidateQueries({ queryKey: ['publishing-overview'] })]); message.success('发布任务已创建'); },
    onError: (error) => message.error(errorMessage(error)) });
  return <Space orientation="vertical" size="large" className="full-width">
    <Typography.Title level={2}>发布管理</Typography.Title>
    <Alert type="info" showIcon title="发布数据库中的已发布内容到公网博客"
      description="只包含状态为已发布且发布时间已到的文章和碎碎念。保存内容后需要点击发布；草稿、归档、未来时间内容不会上线。构建失败保留现有网站，发布成功后从线上移除已删除或撤回的内容。" />
    {overview.isError && <Alert type="error" title={errorMessage(overview.error)} />}
    <Card title="待发布内容" extra={<Button type="primary" loading={publish.isPending} disabled={overview.isPending || overview.isError || !!overview.data?.activeJob}
      onClick={() => { form.resetFields(); setConfirmOpen(true); }}>构建并发布</Button>}>
      <Descriptions column={{ xs: 1, sm: 2 }} items={[
        { key: 'posts', label: '文章', children: overview.data?.posts ?? '—' },
        { key: 'translations', label: '语言版本', children: overview.data?.translations ?? '—' },
        { key: 'moments', label: '碎碎念', children: overview.data?.moments ?? '—' },
        { key: 'current', label: '当前版本', children: overview.data?.currentRelease ?? '—' },
        { key: 'site', label: '线上博客', children: overview.data && <a href={overview.data.siteUrl} target="_blank" rel="noopener noreferrer">查看博客</a> },
        { key: 'active', label: '当前任务', children: overview.data?.activeJob ? <Button type="link" onClick={() => setSelected(overview.data!.activeJob!.id)}>查看构建进度</Button> : '无运行任务' },
      ]} />
    </Card>
    <Card title="发布记录" extra={<Button onClick={() => void jobs.refetch()}>刷新记录</Button>}>
      {jobs.isError && <Alert type="error" title={errorMessage(jobs.error)} />}
      <Table<PublishJobRecord> rowKey="id" loading={jobs.isFetching} dataSource={jobs.data?.items ?? []} scroll={{ x: 800 }}
        pagination={{ current: page, total: jobs.data?.total ?? 0, pageSize: 10, showSizeChanger: false, onChange: setPage }} columns={[
          { title: '创建时间', render: (_, job) => time(job.createdAt) },
          { title: '状态', render: (_, job) => <Tag color={colors[job.status]}>{labels[job.status]}</Tag> },
          { title: '发布备注', width: 240, render: (_, job) => <Typography.Paragraph ellipsis={{ rows: 2, tooltip: job.remark }} style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>{job.remark || '—'}</Typography.Paragraph> },
          { title: '文章 / 碎碎念', render: (_, job) => `${job.postCount} / ${job.momentCount}` },
          { title: '完成时间', render: (_, job) => time(job.finishedAt) },
          { title: '操作', render: (_, job) => <Button onClick={() => setSelected(job.id)}>查看日志</Button> },
        ]} />
    </Card>
    <Modal title="构建并发布最新内容？" open={confirmOpen} onCancel={() => { if (!publish.isPending) setConfirmOpen(false); }}
      onOk={() => form.submit()} confirmLoading={publish.isPending} okButtonProps={{ disabled: !!overview.data?.activeJob }}
      cancelButtonProps={{ disabled: publish.isPending }} closable={!publish.isPending} maskClosable={!publish.isPending} okText="开始发布" cancelText="取消">
      <Typography.Paragraph>将以数据库内容替换线上博客内容。确认文章状态和发布时间后再发布。</Typography.Paragraph>
      <Form name="publish-confirm" form={form} layout="vertical" initialValues={{ remark: '' }} onFinish={(values) => { if (!publish.isPending) publish.mutate({ remark: (values.remark ?? '').trim() }); }}>
        <Form.Item name="remark" label="发布备注（可选）" rules={[{ max: 500, message: '发布备注不能超过 500 字' }]}>
          <Input.TextArea rows={4} maxLength={500} showCount placeholder="例如：更新 JavaScript 入门文章，修复图片显示" />
        </Form.Item>
      </Form>
    </Modal>
    <Drawer title="发布任务日志" open={!!selected} onClose={() => setSelected(undefined)} size={mobile ? '100%' : 'large'}>
      {detail.isError && <Alert type="error" title={errorMessage(detail.error)} />}
      {detail.data && <>
        <Tag color={colors[detail.data.status]}>{labels[detail.data.status]}</Tag>
        <Typography.Paragraph copyable>{detail.data.id}</Typography.Paragraph>
        <Typography.Paragraph style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>发布备注：{detail.data.remark || '无'}</Typography.Paragraph>
        <Typography.Paragraph>开始：{time(detail.data.startedAt)} · 完成：{time(detail.data.finishedAt)}</Typography.Paragraph>
        <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', background: '#111827', color: '#e5e7eb', padding: 16 }}>{detail.data.log || '等待任务启动…'}</pre>
      </>}
    </Drawer>
  </Space>;
}
