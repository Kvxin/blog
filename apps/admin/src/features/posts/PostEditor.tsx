import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Card, Form, Input, Select, Space, Spin, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { postInputSchema, type PostInput, type PostRecord } from '@blog/contracts';
import { request, errorMessage } from '../../lib/api-client';
import { MarkdownEditor } from '../../components/MarkdownEditor';
import { useUnsavedChanges } from '../../lib/use-unsaved-changes';
import { ImageField } from '../media/ImageField';
import { TaxonomySelect } from '../taxonomy/TaxonomySelect';
import { TranslateButton } from '../ai/TranslateButton';

type FormValues = Omit<PostInput, 'publishedAt'> & { publishedAt: string | null };
const emptyTranslation = { locale: 'zh-cn', title: '', description: '', content: '', coverUrl: '' };
export function PostEditor() {
  const { id } = useParams();
  const query = useQuery({ queryKey: ['post', id], queryFn: () => request<PostRecord>(`/posts/${id}`), enabled: !!id });
  if (id && query.isPending) return <Spin />;
  if (id && query.isError) return <Alert type="error" title={errorMessage(query.error)} action={<Button onClick={() => void query.refetch()}>重试</Button>} />;
  return <EditorForm key={id ?? 'new'} post={query.data} />;
}
function EditorForm({ post }: { post?: PostRecord }) {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { message, modal } = App.useApp();
  const [dirty, setDirty] = useState(false);
  useUnsavedChanges(dirty);
  const mutation = useMutation({ mutationFn: async (values: FormValues) => {
    const raw = { ...values, publishedAt: values.publishedAt ? new Date(values.publishedAt).toISOString() : null,
      translations: values.translations.map((translation) => ({ ...translation, coverUrl: translation.coverUrl || null })) };
    const result = postInputSchema.safeParse(raw);
    if (!result.success) throw new Error(result.error.issues.map((issue) => issue.message).join('; '));
    return request<PostRecord>(post ? `/posts/${post.id}` : '/posts', { method: post ? 'PUT' : 'POST',
      body: post ? { ...result.data, expectedUpdatedAt: post.updatedAt } : result.data });
  }, onSuccess: async () => {
    setDirty(false);
    await client.invalidateQueries({ queryKey: ['posts'] });
    client.removeQueries({ queryKey: ['post', post?.id] });
    message.success('文章已保存到数据库');
    navigate('/posts');
  }, onError: (error) => message.error(errorMessage(error)) });
  const back = () => {
    if (!dirty) return navigate('/posts');
    modal.confirm({ title: '放弃未保存的修改？', onOk: () => navigate('/posts'), okText: '放弃修改', cancelText: '继续编辑' });
  };
  return <>
    <Typography.Title level={2}>{post ? '编辑文章' : '新建文章'}</Typography.Title>
    <Alert type="info" showIcon title="保存后请到发布管理构建上线" description="设置为已发布且发布时间已到的文章才会进入发布快照。保存草稿不会影响线上博客。" style={{ marginBottom: 20 }} />
    <Card>
      <Form form={form} layout="vertical" initialValues={post ?? { translationKey: '', status: 'DRAFT', categoryId: null, tagIds: [], publishedAt: null, translations: [emptyTranslation] }}
        onValuesChange={() => setDirty(true)} onFinish={(values) => mutation.mutate(values)}>
        <Form.Item name="translationKey" label="文章标识 / URL slug" rules={[{ required: true }, { pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: '使用小写字母、数字和连字符' }]}>
          <Input maxLength={120} placeholder="my-first-post" />
        </Form.Item>
        <Form.Item name="categoryId" label="文章分类">
          <TaxonomySelect kind="categories" selected={post?.category ? [post.category] : []} />
        </Form.Item>
        <Form.Item name="tagIds" label="文章标签（最多 50 个）">
          <TaxonomySelect kind="tags" multiple selected={post?.tags ?? []} />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select options={[{ value: 'DRAFT', label: '草稿' }, { value: 'PUBLISHED', label: '已发布（数据库）' }, { value: 'ARCHIVED', label: '归档' }]} />
        </Form.Item>
        <Form.Item name="publishedAt" label="发布时间（含时区的 ISO 格式；已发布必填）">
          <Input placeholder="2026-10-14T12:00:00+08:00" />
        </Form.Item>
        <Button style={{ marginBottom: 20 }} onClick={() => { form.setFieldValue('publishedAt', new Date().toISOString()); setDirty(true); }}>使用当前时间</Button>
        <Form.List name="translations">
          {(fields, { add, remove }) => <Space orientation="vertical" className="full-width" size="large">
            {fields.map((field) => <Card key={field.key} title={`语言版本 ${field.name + 1}`} extra={fields.length > 1 ? <Button danger onClick={() => { remove(field.name); setDirty(true); }}>移除版本</Button> : null}>
              <Form.Item name={[field.name, 'locale']} label="语言代码" rules={[{ required: true }, { pattern: /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/, message: '例如 zh-cn、en' }]}><Input maxLength={35} /></Form.Item>
              <Form.Item name={[field.name, 'title']} label="标题" rules={[{ required: true }]}><Input maxLength={200} /></Form.Item>
              <Form.Item name={[field.name, 'description']} label="摘要"><Input.TextArea rows={2} maxLength={500} /></Form.Item>
              <Form.Item name={[field.name, 'coverUrl']} label="封面图片（可选）"><ImageField /></Form.Item>
              <Form.Item name={[field.name, 'content']} label="正文" rules={[{ required: true }]}><MarkdownEditor /></Form.Item>
            </Card>)}
            <Space wrap>
            <Button disabled={fields.length >= 20} onClick={() => { add({ ...emptyTranslation, locale: '' }); setDirty(true); }}>添加语言版本</Button>
            <TranslateButton getSource={() => {
              const sources = form.getFieldValue('translations');
              const source = sources.find((item: FormValues['translations'][number]) => item.locale === 'zh-cn') ?? sources.find((item: FormValues['translations'][number]) => item.locale !== 'en');
              if (!source?.content) throw new Error('请先填写非英文正文');
              return { kind: 'post', sourceLocale: source.locale, title: source.title, description: source.description ?? '', content: source.content };
            }} onApply={(result) => {
              const values = form.getFieldValue('translations') as FormValues['translations'];
              const source = values.find((item) => item.locale === 'zh-cn') ?? values.find((item) => item.locale !== 'en');
              const apply = () => { const english = { ...source!, locale: 'en', title: result.title!, description: result.description!, content: result.content };
                form.setFieldValue('translations', [...values.filter((item) => item.locale !== 'en'), english]); setDirty(true); };
              if (values.some((item) => item.locale === 'en')) modal.confirm({ title: '替换编辑器中已有英文版本？', content: '其他语言版本保留，仍需手动保存。', onOk: apply, okText: '替换英文', cancelText: '取消' });
              else if (values.length >= 20) message.error('语言版本已达上限'); else apply();
            }} />
            </Space>
          </Space>}
        </Form.List>
        <Space className="editor-actions" wrap style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>保存文章</Button>
          <Button onClick={back}>返回列表</Button>
        </Space>
      </Form>
    </Card>
  </>;
}
