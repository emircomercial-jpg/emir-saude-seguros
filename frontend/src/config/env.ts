// Leitura centralizada das variáveis de ambiente do Vite (prefixo VITE_).
// Nunca aceder a import.meta.env directamente fora deste ficheiro.
export const env = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  appName: import.meta.env.VITE_APP_NAME || 'EMIR SAÚDE SEGUROS',
};
