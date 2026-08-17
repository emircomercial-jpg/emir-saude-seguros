// Dados de referência de Angola, para os formulários usarem sempre listas
// de escolha em vez de texto livre — reduz erros de digitação e mantém a
// informação consistente em todo o sistema.
//
// Províncias: lista oficial e actual (21 províncias), em vigor desde 1 de
// Janeiro de 2025, com a nova Divisão Político-Administrativa (Diário da
// República, Série 171) — substitui a antiga lista de 18 províncias.
export const ANGOLA_PROVINCES = [
  'Bengo',
  'Benguela',
  'Bié',
  'Cabinda',
  'Cuando',
  'Cuanza Norte',
  'Cuanza Sul',
  'Cubango',
  'Cunene',
  'Huambo',
  'Huíla',
  'Icolo e Bengo',
  'Luanda',
  'Lunda Norte',
  'Lunda Sul',
  'Malanje',
  'Moxico',
  'Moxico Leste',
  'Namibe',
  'Uíge',
  'Zaire',
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: 'single', label: 'Solteiro(a)' },
  { value: 'married', label: 'Casado(a)' },
  { value: 'de_facto_union', label: 'União de facto' },
  { value: 'divorced', label: 'Divorciado(a)' },
  { value: 'widowed', label: 'Viúvo(a)' },
] as const;

export const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

// Nacionalidades mais comuns no contexto angolano — "Angolana" surge
// primeiro por ser a esmagadora maioria dos registos, seguida dos países
// da CPLP (Comunidade dos Países de Língua Portuguesa) e de países
// vizinhos/com maior presença de residentes em Angola.
export const NATIONALITY_OPTIONS = [
  'Angolana',
  'Portuguesa',
  'Brasileira',
  'Cabo-verdiana',
  'São-tomense',
  'Guineense (Guiné-Bissau)',
  'Moçambicana',
  'Congolesa (RDC)',
  'Congolesa (Congo-Brazzaville)',
  'Namibiana',
  'Sul-africana',
  'Zambiana',
  'Chinesa',
  'Indiana',
  'Libanesa',
  'Outra',
] as const;
