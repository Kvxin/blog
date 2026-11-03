import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (error.code === 'P2002') return response.status(409).json({ message: '唯一标识已存在，请换一个名称或 slug', statusCode: 409 });
    if (error.code === 'P2025') return response.status(404).json({ message: '内容不存在', statusCode: 404 });
    if (error.code === 'P2003') return response.status(409).json({ message: '关联的分类或标签已变更，请刷新后重试', statusCode: 409 });
    Logger.error(`Database operation failed: ${error.code}`, 'Database');
    return response.status(500).json({ message: '数据库操作失败', statusCode: 500 });
  }
}
