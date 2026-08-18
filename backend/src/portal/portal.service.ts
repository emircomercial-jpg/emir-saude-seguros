import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

// Portal de auto-serviço (extra além do briefing original): permite a um
// segurado ou prestador consultar os seus próprios dados, sem qualquer
// acesso administrativo. O acesso é sempre restrito à entidade ligada à
// conta autenticada — nunca a outro segurado/prestador, mesmo que o ID seja
// adivinhado, porque todas as consultas usam o insuredMemberId/providerId
// vindo do próprio utilizador autenticado (nunca de um parâmetro da rota).
@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  private requireInsuredLink(insuredMemberId?: string | null): string {
    if (!insuredMemberId) throw new ForbiddenException('Esta conta não está associada a nenhum segurado.');
    return insuredMemberId;
  }

  private requireProviderLink(providerId?: string | null): string {
    if (!providerId) throw new ForbiddenException('Esta conta não está associada a nenhum prestador.');
    return providerId;
  }

  // ---------- Portal do Segurado ----------

  async getInsuredProfile(insuredMemberId?: string | null) {
    const id = this.requireInsuredLink(insuredMemberId);
    return this.prisma.insuredMember.findUnique({
      where: { id },
      include: { dependents: { where: { deletedAt: null } }, cards: true },
    });
  }

  async getInsuredPolicies(insuredMemberId?: string | null) {
    const id = this.requireInsuredLink(insuredMemberId);
    return this.prisma.policyMember.findMany({
      where: { insuredMemberId: id },
      include: { policy: { include: { plan: true } } },
    });
  }

  async getInsuredClaims(insuredMemberId?: string | null) {
    const id = this.requireInsuredLink(insuredMemberId);
    return this.prisma.claim.findMany({ where: { insuredMemberId: id }, orderBy: { createdAt: 'desc' } });
  }

  async getInsuredReimbursements(insuredMemberId?: string | null) {
    const id = this.requireInsuredLink(insuredMemberId);
    return this.prisma.reimbursement.findMany({ where: { insuredMemberId: id }, orderBy: { createdAt: 'desc' } });
  }

  async getInsuredAuthorizations(insuredMemberId?: string | null) {
    const id = this.requireInsuredLink(insuredMemberId);
    return this.prisma.authorization.findMany({ where: { insuredMemberId: id }, orderBy: { createdAt: 'desc' } });
  }

  async getInsuredPremiums(insuredMemberId?: string | null) {
    const id = this.requireInsuredLink(insuredMemberId);
    return this.prisma.premium.findMany({
      where: { insuredMemberId: id },
      include: { payments: true },
      orderBy: { dueDate: 'desc' },
    });
  }

  // Devolve o cartão activo (ou o mais recente) do PRÓPRIO segurado
  // autenticado — nunca de outro, mesmo que o ID de outro cartão seja
  // adivinhado, porque a pesquisa parte sempre do insuredMemberId ligado
  // à conta, nunca de um parâmetro na rota.
  async getInsuredActiveCard(insuredMemberId?: string | null) {
    const id = this.requireInsuredLink(insuredMemberId);
    const cards = await this.prisma.insuranceCard.findMany({
      where: { insuredMemberId: id },
      include: { insuredMember: true },
      orderBy: { issueDate: 'desc' },
    });
    return cards.find((c) => c.status === 'active') ?? cards[0] ?? null;
  }

  // Documento completo da apólice, mas só se o segurado autenticado for
  // de facto um dos membros dessa apólice — nunca de outra apólice
  // qualquer, mesmo que o ID seja adivinhado.
  async getInsuredPolicyForContract(policyId: string, insuredMemberId?: string | null) {
    const id = this.requireInsuredLink(insuredMemberId);
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, members: { some: { insuredMemberId: id } } },
      include: { plan: true, company: true, members: { include: { insuredMember: true } } },
    });
    if (!policy) throw new ForbiddenException('Apólice não encontrada ou não pertence a este segurado.');
    return policy;
  }

  // ---------- Portal do Prestador ----------

  async getProviderProfile(providerId?: string | null) {
    const id = this.requireProviderLink(providerId);
    return this.prisma.provider.findUnique({ where: { id } });
  }

  async getProviderAuthorizations(providerId?: string | null) {
    const id = this.requireProviderLink(providerId);
    return this.prisma.authorization.findMany({
      where: { providerId: id },
      include: { insuredMember: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProviderInvoices(providerId?: string | null) {
    const id = this.requireProviderLink(providerId);
    return this.prisma.invoice.findMany({ where: { providerId: id }, include: { items: true }, orderBy: { createdAt: 'desc' } });
  }
}
