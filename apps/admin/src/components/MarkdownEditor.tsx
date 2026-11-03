import { Input, Tabs, Typography, Space } from 'antd';
import ReactMarkdown from 'react-markdown';
import { ImagePicker } from '../features/media/ImagePicker';

export function MarkdownEditor({ value = '', onChange }: { value?: string; onChange?: (value: string) => void }) {
  return <Space orientation="vertical" className="full-width">
    <ImagePicker onSelect={(image) => {
      const alt = (image.alt || image.originalName).replace(/[\[\]\\\r\n]/g, ' ');
      onChange?.(`${value}${value ? '\n\n' : ''}![${alt}](${image.url})\n`);
    }} />
    <Tabs items={[
    { key: 'edit', label: 'Markdown 编辑', children: <Input.TextArea value={value} onChange={(event) => onChange?.(event.target.value)} rows={16} maxLength={200_000} placeholder="使用 Markdown 编写正文，不执行 MDX 或 HTML 代码" /> },
    { key: 'preview', label: '预览', children: <div className="markdown-preview">
      <Typography.Paragraph type="secondary">预览不执行原始 HTML/MDX，仅加载本项目七牛云 blog/ 下的图片。</Typography.Paragraph>
      <ReactMarkdown skipHtml components={{
        a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
        img: ({ alt, src }) => src?.startsWith('https://cdn.kvxin.top/blog/') ? <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" /> : <span>[图片：{alt || '未填写说明'}]</span>,
      }}>{value}</ReactMarkdown>
    </div> },
  ]} /></Space>;
}
