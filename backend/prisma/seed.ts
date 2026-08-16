import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// --------------------------------------------------
// Dados iniciais (secção 6 do briefing)
// --------------------------------------------------

const ORG_ID = '00000000-0000-0000-0000-000000000001';

// Catálogo de permissões (módulo.acção) — formato exigido: users.view, users.create, etc.
const PERMISSIONS: { module: string; action: string }[] = [
  { module: 'dashboard', action: 'view' },
  { module: 'users', action: 'view' },
  { module: 'users', action: 'create' },
  { module: 'users', action: 'update' },
  { module: 'users', action: 'delete' },
  { module: 'users', action: 'activate' },
  { module: 'users', action: 'suspend' },
  { module: 'users', action: 'block' },
  { module: 'users', action: 'restore' },
  { module: 'roles', action: 'view' },
  { module: 'roles', action: 'create' },
  { module: 'roles', action: 'update' },
  { module: 'roles', action: 'delete' },
  { module: 'permissions', action: 'view' },
  { module: 'audit', action: 'view' },
  { module: 'settings', action: 'view' },
  { module: 'settings', action: 'update' },
  { module: 'profile', action: 'view' },
  { module: 'profile', action: 'update' },
  { module: 'insured', action: 'view' },
  { module: 'insured', action: 'create' },
  { module: 'insured', action: 'update' },
  { module: 'insured', action: 'delete' },
  { module: 'insured', action: 'activate' },
  { module: 'insured', action: 'suspend' },
  { module: 'dependents', action: 'view' },
  { module: 'dependents', action: 'create' },
  { module: 'dependents', action: 'update' },
  { module: 'dependents', action: 'delete' },
  { module: 'companies', action: 'view' },
  { module: 'companies', action: 'create' },
  { module: 'companies', action: 'update' },
  { module: 'companies', action: 'delete' },
  { module: 'plans', action: 'view' },
  { module: 'plans', action: 'create' },
  { module: 'plans', action: 'update' },
  { module: 'plans', action: 'delete' },
  { module: 'plans', action: 'configure' },
  { module: 'policies', action: 'view' },
  { module: 'policies', action: 'create' },
  { module: 'policies', action: 'update' },
  { module: 'policies', action: 'delete' },
  { module: 'cards', action: 'view' },
  { module: 'cards', action: 'create' },
  { module: 'cards', action: 'update' },
  { module: 'providers', action: 'view' },
  { module: 'providers', action: 'create' },
  { module: 'providers', action: 'update' },
  { module: 'providers', action: 'delete' },
  { module: 'authorizations', action: 'view' },
  { module: 'authorizations', action: 'create' },
  { module: 'authorizations', action: 'approve' },
  { module: 'authorizations', action: 'reject' },
  { module: 'consultations', action: 'view' },
  { module: 'consultations', action: 'create' },
  { module: 'pharmacy', action: 'view' },
  { module: 'pharmacy', action: 'create' },
  { module: 'pharmacy', action: 'configure' },
  { module: 'laboratory', action: 'view' },
  { module: 'laboratory', action: 'create' },
  { module: 'laboratory', action: 'update' },
  { module: 'claims', action: 'view' },
  { module: 'claims', action: 'create' },
  { module: 'claims', action: 'approve' },
  { module: 'reimbursements', action: 'view' },
  { module: 'reimbursements', action: 'create' },
  { module: 'reimbursements', action: 'approve' },
  { module: 'billing', action: 'view' },
  { module: 'billing', action: 'create' },
  { module: 'billing', action: 'approve' },
  { module: 'payments', action: 'view' },
  { module: 'payments', action: 'create' },
  { module: 'payments', action: 'configure' },
  { module: 'reports', action: 'view' },
  { module: 'integrations', action: 'view' },
  { module: 'integrations', action: 'manage' },
];

// Perfis iniciais (secção 6). "Superadministrador" é sempre um perfil de
// sistema (isSystem = true) e nunca pode ser eliminado pela aplicação.
const ROLES: { name: string; code: string; isSystem: boolean }[] = [
  { name: 'Superadministrador', code: 'superadmin', isSystem: true },
  { name: 'Administrador', code: 'admin', isSystem: true },
  { name: 'Gestor de Seguros', code: 'insurance_manager', isSystem: false },
  { name: 'Operador de Cadastro', code: 'registration_operator', isSystem: false },
  { name: 'Gestor Financeiro', code: 'financial_manager', isSystem: false },
  { name: 'Auditor', code: 'auditor', isSystem: false },
  { name: 'Médico', code: 'doctor', isSystem: false },
  { name: 'Enfermeiro', code: 'nurse', isSystem: false },
  { name: 'Farmacêutico', code: 'pharmacist', isSystem: false },
  { name: 'Técnico de Laboratório', code: 'lab_technician', isSystem: false },
  { name: 'Recepcionista', code: 'receptionist', isSystem: false },
  { name: 'Gestor de Empresa', code: 'company_manager', isSystem: false },
  { name: 'Segurado', code: 'insured', isSystem: false },
  { name: 'Prestador', code: 'provider', isSystem: false },
  { name: 'Agente Comercial', code: 'sales_agent', isSystem: false },
  { name: 'Atendimento ao Cliente', code: 'customer_support', isSystem: false },
];

async function main() {
  // 1. Organização
  const organization = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {},
    create: {
      id: ORG_ID,
      name: 'EMIR SAÚDE SEGUROS',
      legalName: 'EMIR PHARMA JULIETA LDA',
      nif: process.env.ORGANIZATION_NIF || null,
      status: 'active',
    },
  });
  console.log(`Organização: ${organization.name} (${organization.legalName})`);

  // 2. Catálogo de permissões
  for (const perm of PERMISSIONS) {
    const code = `${perm.module}.${perm.action}`;
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { ...perm, code },
    });
  }
  console.log(`Permissões: ${PERMISSIONS.length} criadas/actualizadas.`);

  // 3. Perfis
  const roleRecords: Record<string, { id: string }> = {};
  for (const role of ROLES) {
    const record = await prisma.role.upsert({
      where: { code: role.code },
      update: {},
      create: { organizationId: organization.id, ...role },
    });
    roleRecords[role.code] = record;
  }
  console.log(`Perfis: ${ROLES.length} criados/actualizados.`);

  // 4. Superadministrador recebe todas as permissões
  const allPermissions = await prisma.permission.findMany();
  const superadminRole = roleRecords['superadmin'];
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superadminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: superadminRole.id, permissionId: permission.id },
    });
  }
  console.log('Superadministrador: todas as permissões atribuídas.');

  // 5. Utilizador administrador inicial — nunca com senha fixa no código.
  const adminName = process.env.ADMIN_NAME || 'Administrador Geral';
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      'ADMIN_EMAIL e ADMIN_PASSWORD têm de estar definidos no .env antes de correr o seed.',
    );
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      organizationId: organization.id,
      fullName: adminName,
      email: adminEmail,
      passwordHash,
      status: 'active',
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: superadminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: superadminRole.id },
  });

  console.log(`Utilizador administrador: ${adminEmail} (perfil Superadministrador).`);

  // 6. Configurações iniciais do sistema (secção 20 — localização e moeda)
  const settings: { key: string; value: any; category: string }[] = [
    { key: 'organization.country', value: 'Angola', category: 'organization' },
    { key: 'organization.currency', value: 'AOA', category: 'localization' },
    { key: 'organization.language', value: 'pt', category: 'localization' },
    { key: 'organization.timezone', value: 'Africa/Luanda', category: 'localization' },
    { key: 'security.max_login_attempts', value: Number(process.env.MAX_LOGIN_ATTEMPTS || 5), category: 'security' },
    { key: 'security.login_lock_minutes', value: Number(process.env.LOGIN_LOCK_MINUTES || 15), category: 'security' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { organizationId_key: { organizationId: organization.id, key: setting.key } },
      update: { value: setting.value },
      create: { organizationId: organization.id, ...setting },
    });
  }
  console.log(`Configurações iniciais: ${settings.length} criadas/actualizadas.`);

  console.log('\nSeed concluído com sucesso.');

  // IMPORTANTE: o seed nunca altera a senha de uma conta administradora já
  // existente, mesmo que ADMIN_PASSWORD tenha mudado no .env desde a última
  // vez que correu — só define a senha na CRIAÇÃO da conta. Isto evita que
  // um .env desactualizado (ex: esquecido num servidor) reponha
  // silenciosamente a senha de uma conta cuja senha já foi alterada por
  // quem a usa. A mensagem abaixo reflecte sempre o que realmente
  // aconteceu, para nunca dar a entender que a senha mudou quando não mudou.
  if (existingAdmin) {
    console.log(
      `Acesso: ${adminEmail} · esta conta já existia — a senha NÃO foi alterada por este seed.\n` +
      'Para definir uma nova senha para esta conta, use "Esqueci a senha" na página de login, ' +
      'ou peça a outro administrador para a redefinir em Utilizadores → Redefinir palavra-passe.',
    );
  } else {
    console.log(`Acesso inicial → e-mail: ${adminEmail} · senha: a definida em ADMIN_PASSWORD no .env.`);
  }
}

main()
  .catch((err) => {
    console.error('Erro ao correr o seed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
