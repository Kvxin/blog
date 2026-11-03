import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Descriptions, Form, Input, Modal, Space, Typography } from 'antd';
import type { MediaRecord, MediaConfig } from '@blog/contracts';
import { request, errorMessage } from '../../lib/api-client';
import { MediaBrowser } from './MediaBrowser';

export function MediaPage() {
  const config = useQuery({ queryKey: ['media-config'], queryFn: () => request<MediaConfig>('/media/config') });
  const client = useQueryClient();
  const { message } = App.useApp();
  const [editing, setEditing] = useState<MediaRecord>();
  const [form] = Form.useForm<{ alt: string }>();
  const mutation = useMutation({ mutationFn: (alt: string) => request(`/media/${editing!.id}`, { method: 'PATCH', body: { alt } }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ['media'] }); setEditing(undefined); message.success('图片说明已更新'); },
    onError: (error) => message.error(errorMessage(error)) });
  return <Space orientation="vertical" size="large" className="full-width">
    <Typography.Title level={2}>素材库</Typography.Title>
    <Alert type="info" showIcon title="图片统一存储到七牛云 ai-dramas / blog/" description="支持 JPG、PNG、WebP、GIF、AVIF、ICO，单张最大 10 MB。不会列出或操作空间里的其他目录，也不提供云端删除操作。" />
    {config.isError && <Alert type="error" title={errorMessage(config.error)} />}
    {config.data && <Descriptions size="small" column={{ xs: 1, sm: 2 }} items={[
      { key: 'bucket', label: '空间', children: config.data.bucket },
      { key: 'region', label: '地区', children: '华南-广东 (z2)' },
      { key: 'prefix', label: '目录前缀', children: config.data.prefix },
      { key: 'domain', label: '外链', children: config.data.domain },
      { key: 'ready', label: '凭据', children: config.data.configured ? '后端已配置' : '后端未配置 AK/SK' },
    ]} />}
    <MediaBrowser onEditAlt={(image) => { setEditing(image); form.setFieldsValue({ alt: image.alt }); }} />
    <Modal title="图片说明" open={!!editing} onCancel={() => setEditing(undefined)} onOk={() => form.submit()} confirmLoading={mutation.isPending}>
      <Form form={form} onFinish={(values) => mutation.mutate(values.alt)} layout="vertical"><Form.Item name="alt" label="替代文本 / 图片说明"><Input maxLength={300} /></Form.Item></Form>
    </Modal>
  </Space>;
}
