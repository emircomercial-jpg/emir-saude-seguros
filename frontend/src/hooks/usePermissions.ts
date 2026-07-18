import { useAuthStore } from '@/stores/authStore';

// Verificação de permissões no frontend (secção 13 do briefing): apenas para
// ocultar/desabilitar opções na interface — o backend valida sempre de novo,
// nunca se depende exclusivamente da protecção visual.
//
// Nota: o utilizador autenticado (AuthUser) expõe os PERFIS (roles), não a
// lista de permissões resolvida — a resolução fina de "o que este perfil
// pode fazer" é feita no backend. Para decisões simples de UI (ex: esconder
// um botão "Nova Empresa" de quem não é Administrador), comparamos por
// código de perfil; para controlo fino por acção, o backend continua a ser
// a única fonte de verdade.
export function useHasRole(...roleCodes: string[]): boolean {
  const user = useAuthStore((s) => s.user);
  if (!user) return false;
  return user.roles.some((role) => roleCodes.includes(role.code));
}
