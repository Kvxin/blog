import { useState } from 'react';
import { Alert, App, Button, Input, Modal, Space, Typography } from 'antd';
import type { AiTranslateInput, AiTranslation } from '@blog/contracts';
import { request, errorMessage } from '../../lib/api-client';

export function TranslateButton({ getSource, onApply }: { getSource: () => AiTranslateInput; onApply: (result: AiTranslation) => void }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AiTranslation>();
  const { message, modal } = App.useApp();
  const translate = async () => {
    setBusy(true);
    try { setResult(await request<AiTranslation>('/ai/translate', { method: 'POST', body: getSource() })); }
    catch (error) { message.error(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return <>
    <Button loading={busy} disabled={busy} onClick={() => modal.confirm({ title: '翻译为英文？', content: '将当前编辑内容发送给 AI 管理中配置的服务，可能产生费用。结果先预览，确认后才填入编辑器。', okText: '开始翻译', cancelText: '取消', onOk: translate })}>AI 翻译为英文</Button>
    <Modal title="英文翻译预览" open={!!result} onCancel={() => setResult(undefined)} width={850} okText="应用到编辑器" cancelText="取消"
      onOk={() => { if (result) { onApply(result); setResult(undefined); } }}>
      <Alert type="info" title="请检查翻译结果；应用后仍需手动保存和发布。" style={{ marginBottom: 16 }} />
      <Space orientation="vertical" className="full-width">
        {result?.title !== undefined && <><Typography.Text>英文标题</Typography.Text><Input value={result.title} onChange={(e) => setResult({ ...result, title: e.target.value })} /></>}
        {result?.description !== undefined && <><Typography.Text>英文摘要</Typography.Text><Input.TextArea value={result.description} onChange={(e) => setResult({ ...result, description: e.target.value })} /></>}
        <Typography.Text>英文正文（Markdown）</Typography.Text>
        <Input.TextArea rows={12} value={result?.content} onChange={(e) => result && setResult({ ...result, content: e.target.value })} />
        {result?.location !== undefined && <Input value={result.location} onChange={(e) => setResult({ ...result, location: e.target.value })} addonBefore="英文地点" />}
      </Space>
    </Modal>
  </>;
}
