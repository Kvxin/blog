import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, AutoComplete, Button, Card, Form, Input, InputNumber, Space, Spin, Switch, Typography } from 'antd';
import type { AiConfig, AiConfigInput } from '@blog/contracts';
import { request, errorMessage } from '../../lib/api-client';

export function AiPage() {
  const config = useQuery({ queryKey: ['ai-config'], queryFn: () => request<AiConfig>('/ai/config') });
  if (config.isPending) return <Spin />;
  if (config.isError) return <Alert type="error" title={errorMessage(config.error)} action={<Button onClick={() => void config.refetch()}>重试</Button>} />;
  return <AiForm key={config.data.updatedAt ?? 'empty'} config={config.data} />;
}
function AiForm({ config }: { config: AiConfig }) {
  const [form] = Form.useForm<AiConfigInput>();
  const client = useQueryClient();
  const { message, modal } = App.useApp();
  const [models, setModels] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);
  const save = useMutation({ mutationFn: (values: AiConfigInput) => request<AiConfig>('/ai/config', { method: 'PUT', body: {
    name: values.name ?? '', baseUrl: values.baseUrl ?? '', model: values.model ?? '', prompt: values.prompt ?? '', apiKey: values.apiKey, clearApiKey: values.clearApiKey,
    temperature: values.temperature ?? null, maxTokens: values.maxTokens ?? null, expectedUpdatedAt: config.updatedAt,
  } }), onSuccess: (data) => { client.setQueryData(['ai-config'], data); message.success('AI 配置已保存'); }, onError: (error) => message.error(errorMessage(error)) });
  const fetchModels = useMutation({ mutationFn: () => request<{ models: string[] }>('/ai/models', { method: 'POST', body: {} }),
    onSuccess: (data) => { setModels(data.models); message.success(`获取到 ${data.models.length} 个模型`); }, onError: (error) => message.error(errorMessage(error)) });
  const test = useMutation({ mutationFn: () => request<{ latencyMs: number }>('/ai/test', { method: 'POST', body: {} }),
    onSuccess: (data) => message.success(`连接成功，耗时 ${data.latencyMs} ms`), onError: (error) => message.error(errorMessage(error)) });
  return <Space orientation="vertical" size="large" className="full-width">
    <Typography.Title level={2}>AI 管理</Typography.Title>
    <Alert type="info" showIcon title="仅支持 OpenAI 兼容 Chat Completions 格式"
      description="配置初始为空，请自行填写地址、密钥、模型和翻译提示词。先保存配置再获取模型或测试连接。测试和翻译会调用你配置的服务，可能产生费用；翻译不会自动保存或发布。" />
    <Form form={form} layout="vertical" initialValues={{ ...config, apiKey: '', clearApiKey: false }} onValuesChange={() => setDirty(true)} onFinish={(values) => save.mutate(values)}>
      <Card title="接口配置（OpenAI 格式）">
        <Form.Item name="name" label="配置名称"><Input maxLength={80} placeholder="自行填写名称" /></Form.Item>
        <Form.Item name="baseUrl" label="API Base URL" extra="填写接口前缀（通常以 /v1 结尾），后端追加 /chat/completions 或 /models。仅支持公网 HTTPS。">
          <Input maxLength={2048} placeholder="填写你的 HTTPS 接口地址" autoComplete="off" />
        </Form.Item>
        <Form.Item name="apiKey" label="API Key" extra={config.hasApiKey ? '密钥已加密保存。留空保留原密钥，输入新值替换；后端不会回传密钥。' : '尚未配置密钥。'}>
          <Input.Password autoComplete="new-password" maxLength={4096} placeholder={config.hasApiKey ? '留空保留已保存密钥' : '填写你的 API Key'} />
        </Form.Item>
        <Form.Item name="clearApiKey" label="清除已保存密钥" valuePropName="checked"><Switch /></Form.Item>
        <Form.Item name="model" label="模型 ID"><AutoComplete options={models.map((value) => ({ value }))} filterOption={(input, option) => String(option?.value).toLowerCase().includes(input.toLowerCase())} placeholder="手动填写模型，或获取模型列表" /></Form.Item>
        <Space wrap>
          <Button loading={fetchModels.isPending} disabled={dirty || !config.hasApiKey || !config.baseUrl} onClick={() => fetchModels.mutate()}>获取模型列表</Button>
          <Button loading={test.isPending} disabled={dirty || !config.hasApiKey || !config.baseUrl || !config.model}
            onClick={() => modal.confirm({ title: '测试已保存的接口？', content: '将发送一个简短请求，可能产生 API 费用。', onOk: () => test.mutateAsync(), okText: '测试连接', cancelText: '取消' })}>测试连接</Button>
        </Space>
        {dirty && <Typography.Paragraph type="secondary">有未保存修改，请先保存再测试。</Typography.Paragraph>}
      </Card>
      <Card title="翻译提示词" style={{ marginTop: 20 }}>
        <Form.Item name="prompt" label="系统提示词" extra="自行描述英语风格、术语和 Markdown 格式要求。后端会追加 JSON 输出和代码/链接保护约束。此字段为空时不会执行翻译。">
          <Input.TextArea rows={8} maxLength={20000} showCount placeholder="自行填写翻译提示词" />
        </Form.Item>
        <Space align="start" wrap>
          <Form.Item name="temperature" label="Temperature（可选）"><InputNumber min={0} max={2} step={0.1} placeholder="留空使用接口默认值" style={{ width: 210 }} /></Form.Item>
          <Form.Item name="maxTokens" label="输出 Token 上限（可选）"><InputNumber min={1} max={32768} precision={0} placeholder="留空使用接口默认值" style={{ width: 210 }} /></Form.Item>
        </Space>
      </Card>
      <Button type="primary" htmlType="submit" loading={save.isPending} style={{ marginTop: 20 }}>保存 AI 配置</Button>
    </Form>
  </Space>;
}
