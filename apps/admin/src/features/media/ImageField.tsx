import { Image, Input, Space } from 'antd';
import { ImagePicker } from './ImagePicker';

export function ImageField({ value, onChange, id }: { value?: string | null; onChange?: (url: string) => void; id?: string }) {
  const trusted = value?.startsWith('https://cdn.kvxin.top/blog/');
  return <Space orientation="vertical" className="full-width">
    <Input id={id} value={value ?? ''} onChange={(event) => onChange?.(event.target.value)} maxLength={2048} placeholder="选择或上传图片后自动填入 HTTPS 地址" />
    <ImagePicker onSelect={(image) => onChange?.(image.url)} />
    {trusted && <Image src={value!} alt="所选图片" height={120} referrerPolicy="no-referrer" />}
  </Space>;
}
