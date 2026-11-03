import { useState } from 'react';
import { Button, Modal, Space } from 'antd';
import type { MediaRecord } from '@blog/contracts';
import { MediaBrowser } from './MediaBrowser';
import { ImageUpload } from './ImageUpload';

export function ImagePicker({ onSelect }: { onSelect: (image: MediaRecord) => void }) {
  const [open, setOpen] = useState(false);
  return <>
    <Space wrap><ImageUpload onUploaded={onSelect} /><Button onClick={() => setOpen(true)}>从素材库选择</Button></Space>
    <Modal title="选择七牛云图片" open={open} onCancel={() => setOpen(false)} footer={null} width={1000} destroyOnHidden>
      <MediaBrowser onSelect={(image) => { onSelect(image); setOpen(false); }} />
    </Modal>
  </>;
}
