import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Form, Input, Select, Space, Spin, Typography } from 'antd';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { momentInputSchema, type MomentInput, type MomentRecord } from '@blog/contracts';
import { request, errorMessage } from '../../lib/api-client';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { statusOptions } from '../posts/PostsPage';
import { useUnsavedChanges } from '../../lib/use-unsaved-changes';
import { ImageField } from '../media/ImageField';
import { TranslateButton } from '../ai/TranslateButton';

export function MomentEditor() {
  const { id } = useParams();
  const query = useQuery({ queryKey: ['moment', id], queryFn: () => request<MomentRecord>(`/moments/${id}`), enabled: !!id });
  if (id && query.isPending) return <Spin />;
  if (id && query.isError) return <Alert type="error" title={errorMessage(query.error)} action={<Button onClick={() => void query.refetch()}>重试</Button>} />;
  return <EditorForm key={id ?? 'new'} moment={query.data} />;
}
function EditorForm({ moment }: { moment?: MomentRecord }) {
  const location = useLocation();
  const translatedMoment = location.state?.translatedMoment as MomentInput | undefined;
  const [form] = Form.useForm<MomentInput>();
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  const client = useQueryClient();
  const navigate = useNavigate();
  const { message, modal } = App.useApp();
  const mutation = useMutation({ mutationFn: async (values: MomentInput) => {
    const raw = { ...values, location: values.location || null, images: values.images ?? [], publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : null };
    const result = momentInputSchema.safeParse(raw);
    if (!result.success) throw new Error(result.error.issues.map((issue) => issue.message).join('; '));
    return request<MomentRecord>(moment ? `/moments/${moment.id}` : '/moments', { method: moment ? 'PUT' : 'POST',
      body: moment ? { ...result.data, expectedUpdatedAt: moment.updatedAt } : result.data });
  }, onSuccess: async () => {
    setDirty(false);
    await client.invalidateQueries({ queryKey: ['moments'] });
    client.removeQueries({ queryKey: ['moment', moment?.id] });
    message.success('碎碎念已保存到数据库'); navigate('/moments');
  }, onError: (error) => message.error(errorMessage(error)) });
  return <>
    <Typography.Title level={2}>{moment ? '编辑碎碎念' : '新建碎碎念'}</Typography.Title>
    <Card><Form form={form} layout="vertical" initialValues={moment ?? translatedMoment ?? { locale: 'zh-cn', content: '', location: '', images: [], status: 'DRAFT', publishedAt: null }}
      onValuesChange={() => setDirty(true)} onFinish={(values) => mutation.mutate(values)}>
      <Form.Item name="locale" label="语言代码" rules={[{ required: true }]}><Input placeholder="zh-cn" maxLength={35} /></Form.Item>
      <Form.Item name="content" label="内容" rules={[{ required: true }]}><MarkdownEditor /></Form.Item>
      <Form.Item name="location" label="地点"><Input maxLength={200} /></Form.Item>
      <Form.Item name="status" label="状态" rules={[{ required: true }]}><Select options={statusOptions} /></Form.Item>
      <Form.Item name="publishedAt" label="发布时间（含时区的 ISO 格式；已发布必填）"><Input placeholder="2026-10-14T12:00:00+08:00" /></Form.Item>
      <Button style={{ marginBottom: 20 }} onClick={() => { form.setFieldValue('publishedAt', new Date().toISOString()); setDirty(true); }}>使用当前时间</Button>
      <Form.List name="images">{(fields, { add, remove }) => <Space orientation="vertical" className="full-width">
        {fields.map((field) => <Card key={field.key} title={`配图 ${field.name + 1}`} extra={<Button danger onClick={() => { remove(field.name); setDirty(true); }}>移除配图</Button>}>
          <Form.Item name={[field.name, 'src']} label="配图" rules={[{ required: true }]}><ImageField /></Form.Item>
          <Form.Item name={[field.name, 'alt']} label="图片说明"><Input maxLength={300} /></Form.Item>
        </Card>)}
        <Button disabled={fields.length >= 20} onClick={() => { add({ src: '', alt: '' }); setDirty(true); }}>添加配图</Button>
      </Space>}</Form.List>
      <Space className="editor-actions" wrap style={{ marginTop: 24 }}>
        <TranslateButton getSource={() => {
          const values = form.getFieldsValue(true) as MomentInput;
          return { kind: 'moment', sourceLocale: values.locale, content: values.content, location: values.location ?? '', imageAlts: (values.images ?? []).map((image) => image.alt ?? '') };
        }} onApply={(result) => {
          const apply = () => {
            const values = form.getFieldsValue(true) as MomentInput;
            form.setFieldsValue({ locale: 'en', content: result.content, location: result.location ?? null,
              images: (values.images ?? []).map((image, i) => ({ ...image, alt: result.imageAlts?.[i] ?? image.alt })) }); setDirty(true);
          };
          // Create a separate English moment; preserve the original Chinese record.
          if (moment) {
            const values = form.getFieldsValue(true) as MomentInput;
            navigate('/moments/new', { state: { translatedMoment: { ...values, locale: 'en', content: result.content, location: result.location ?? null, status: 'DRAFT', publishedAt: null,
              images: (values.images ?? []).map((image, i) => ({ ...image, alt: result.imageAlts?.[i] ?? image.alt })) } } });
          } else apply();
        }} />
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>保存碎碎念</Button>
        <Button onClick={() => dirty ? modal.confirm({ title: '放弃未保存的修改？', okText: '放弃修改', cancelText: '继续编辑', onOk: () => navigate('/moments') }) : navigate('/moments')}>返回列表</Button>
      </Space>
    </Form></Card>
  </>;
}
