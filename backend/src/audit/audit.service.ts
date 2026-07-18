import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizePagination, buildPaginationMeta } from '../common/utils/pagination.util';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

// Registo de auditoria (secção 19 do briefing). Propositadamente, não existe
// nenhum método de update/delete — nenhum utilizador deve poder editar ou
// eliminar logs de auditoria pela aplicação.
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  log(data: {
    organizationId?: string;
    userId?: string;
    action: string;
    module: string;
    entity?: string;
    entityId?: string;
    description?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }

  async findAll(organizationId: string, query: QueryAuditLogsDto) {
    const { page, pageSize, skip, take } = normalizePagination(query);

    const where = {
      organizationId,
      userId: query.userId || undefined,
      module: query.module || undefined,
      action: query.action || undefined,
      entity: query.entity || undefined,
      createdAt: {
        gte: query.from ? new Date(query.from) : undefined,
        lte: query.to ? new Date(query.to) : undefined,
      },
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(page, pageSize, totalItems) };
  }

  async findOne(id: string, organizationId: string) {
    const log = await this.prisma.auditLog.findFirst({
      where: { id, organizationId },
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
    if (!log) throw new NotFoundException('Registo de auditoria não encontrado.');
    return log;
  }
}
