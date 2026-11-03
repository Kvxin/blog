import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Descriptions, Space, Spin, Tag, Typography } from 'antd';
import { getHealth } from '../../lib/api-client';

export function DashboardPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth });
  return (
    <Space orientation="vertical" size="large" className="full-width">
      <div>
        <Typography.Title level={2}>系统概览</Typography.Title>
        <Typography.Paragraph type="secondary">Astro 前台 · Ant Design 后台 · NestJS API · PostgreSQL</Typography.Paragraph>
      </div>
      <Card title="服务状态" extra={<Button onClick={() => void health.refetch()} loading={health.isFetching}>刷新</Button>}>
        {health.isPending ? <Spin tip="正在检查 API" /> : health.isError ? (
          <Alert type="error" showIcon title="无法连接 API" description="请检查 NestJS 是否启动，以及 /api/ 代理配置。" />
        ) : (
          <Descriptions column={1} items={[
            { key: 'api', label: 'API', children: <Tag color="success">正常</Tag> },
            { key: 'db', label: 'PostgreSQL', children: <Tag color="success">已连接</Tag> },
            { key: 'time', label: '检查时间', children: new Date(health.data.timestamp).toLocaleString('zh-CN') },
          ]} />
        )}
      </Card>
      <Card title="后续开发">
        <Typography.Paragraph>已支持内容编辑、图片上传和发布管理。将内容设置为已发布后，在发布管理点击构建并发布即可更新公网博客。</Typography.Paragraph>
      </Card>
    </Space>
  );
}
