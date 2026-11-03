import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Card, Col, Image, Input, Pagination, Row, Space, Typography } from 'antd';
import type { MediaRecord, PageResult } from '@blog/contracts';
import { request, errorMessage } from '../../lib/api-client';
import { ImageUpload } from './ImageUpload';

export function MediaBrowser({ onSelect, onEditAlt }: { onSelect?: (image: MediaRecord) => void; onEditAlt?: (image: MediaRecord) => void }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['media', page, search], queryFn: () => request<PageResult<MediaRecord>>(`/media?${new URLSearchParams({ page: String(page), search })}`) });
  return <Space orientation="vertical" size="large" className="full-width">
    <Space wrap className="list-toolbar">
      <ImageUpload onUploaded={onSelect} />
      <Input.Search placeholder="搜索文件名或图片说明" allowClear style={{ width: 250 }} onSearch={(value) => { setSearch(value); setPage(1); }} />
      <Button onClick={() => void query.refetch()}>刷新素材</Button>
    </Space>
    {query.isError && <Alert type="error" title={errorMessage(query.error)} />}
    <Row gutter={[16, 16]}>
      {(query.data?.items ?? []).map((image) => <Col key={image.id} xs={24} sm={12} lg={8} xl={6}>
        <Card size="small" loading={query.isPending}>
          <div className="media-thumbnail"><Image src={image.url} alt={image.alt || image.originalName} height={150} style={{ objectFit: 'contain', maxWidth: '100%' }} referrerPolicy="no-referrer" /></div>
          <Typography.Paragraph ellipsis={{ tooltip: image.originalName }} style={{ marginTop: 12 }}>{image.originalName}</Typography.Paragraph>
          <Typography.Text type="secondary">{(image.size / 1024).toFixed(1)} KB</Typography.Text>
          <Typography.Paragraph copyable={{ text: image.url }} ellipsis={{ tooltip: image.url }}>{image.url}</Typography.Paragraph>
          <Space wrap>
            {onSelect && <Button type="primary" onClick={() => onSelect(image)}>选择图片</Button>}
            {onEditAlt && <Button onClick={() => onEditAlt(image)}>编辑说明</Button>}
          </Space>
        </Card>
      </Col>)}
    </Row>
    {!query.isPending && !query.data?.items.length && !query.isError && <Typography.Text type="secondary">暂无图片，可以上传新图片。</Typography.Text>}
    <Pagination current={page} total={query.data?.total ?? 0} pageSize={12} showSizeChanger={false} onChange={setPage} />
  </Space>;
}
