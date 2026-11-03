import { createHmac } from 'node:crypto';
import { Injectable, Logger, ServiceUnavailableException, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fetch, FormData, ProxyAgent } from 'undici';

const base64url = (value: Buffer | string) => Buffer.from(value).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
export const QINIU_PREFIX = 'blog/';
export const QINIU_BUCKET = 'ai-dramas';
export const QINIU_DOMAIN = 'https://cdn.kvxin.top';

@Injectable()
export class QiniuStorage {
  private readonly proxy?: ProxyAgent;
  constructor(private readonly config: ConfigService) {
    const proxy = config.get<string>('QI_NIU_PROXY');
    if (proxy) this.proxy = new ProxyAgent(proxy);
  }
  configured() { return !!this.config.get<string>('QI_NIU_AK') && !!this.config.get<string>('QI_NIU_SK'); }
  url(key: string) {
    this.validateKey(key);
    return `${QINIU_DOMAIN}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }
  private validateKey(key: string) {
    if (!key.startsWith(QINIU_PREFIX) || key.includes('..') || !/^[a-zA-Z0-9/_\-.]+$/.test(key)) {
      throw new Error('Invalid blog storage key');
    }
  }
  private token(key: string, size: number, mime: string) {
    if (!this.configured()) throw new ServiceUnavailableException('七牛云 AK/SK 尚未配置');
    this.validateKey(key);
    const policy = base64url(JSON.stringify({
      scope: `${QINIU_BUCKET}:${key}`, deadline: Math.floor(Date.now() / 1000) + 600,
      insertOnly: 1, fsizeLimit: size,
      mimeLimit: mime === 'image/x-icon' ? 'image/x-icon;image/vnd.microsoft.icon' : mime,
    }));
    const signature = base64url(createHmac('sha1', this.config.getOrThrow<string>('QI_NIU_SK')).update(policy).digest());
    return `${this.config.getOrThrow<string>('QI_NIU_AK')}:${signature}:${policy}`;
  }
  async upload(key: string, bytes: Buffer, mime: string) {
    const form = new FormData();
    form.set('token', this.token(key, bytes.length, mime));
    form.set('key', key);
    form.set('file', new Blob([new Uint8Array(bytes)], { type: mime }), key.split('/').at(-1)!);
    try {
      const response = await fetch('https://up-z2.qiniup.com', {
        method: 'POST', body: form, signal: AbortSignal.timeout(60_000), dispatcher: this.proxy,
      });
      const body = await response.json() as { key?: string; error?: string };
      if (!response.ok || body.key !== key) {
        // Never log the form/token, credentials, upstream body or request object.
        Logger.warn(`Qiniu upload failed (HTTP ${response.status})`, 'Qiniu');
        throw new BadGatewayException(`七牛云上传失败（HTTP ${response.status}），请检查空间权限、地区及网络`);
      }
      return this.url(key);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      Logger.warn('Qiniu upload connection failed', 'Qiniu');
      throw new BadGatewayException('七牛云连接失败，请检查网络或后端 QI_NIU_PROXY 配置');
    }
  }
}
