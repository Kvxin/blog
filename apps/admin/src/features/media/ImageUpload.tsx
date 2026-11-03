import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App, Button, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { MediaRecord } from '@blog/contracts';
import { uploadImage, errorMessage } from '../../lib/api-client';

export function ImageUpload({ onUploaded }: { onUploaded?: (image: MediaRecord) => void }) {
  const [busy, setBusy] = useState(false);
  const client = useQueryClient();
  const { message } = App.useApp();
  return <Upload accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/x-icon,.ico" showUploadList={false} disabled={busy}
    beforeUpload={(file) => {
      if (file.size > 10 * 1024 * 1024) { message.error('图片不能超过 10 MB'); return Upload.LIST_IGNORE; }
      setBusy(true);
      void uploadImage(file).then(async (image) => {
        await client.invalidateQueries({ queryKey: ['media'] });
        message.success('图片已上传到七牛云 blog/');
        onUploaded?.(image);
      }).catch((error) => message.error(errorMessage(error))).finally(() => setBusy(false));
      return false;
    }}>
    <Button icon={<UploadOutlined />} loading={busy}>上传图片</Button>
  </Upload>;
}
