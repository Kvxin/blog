import { Card, Empty, Typography } from 'antd';

export function FeaturePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <>
      <Typography.Title level={2}>{title}</Typography.Title>
      <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
      <Card><Empty description="模块结构已预留，业务功能尚未实现" /></Card>
    </>
  );
}
