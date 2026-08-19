import axios from 'axios';

const publicApi = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

export interface SignupPayload {
  name: string;
  legalName?: string;
  nif?: string;
  phone?: string;
  adminFullName: string;
  adminEmail: string;
  adminPassword: string;
}

export async function submitSignup(payload: SignupPayload) {
  const { data } = await publicApi.post('/public/signup', payload);
  return data.data as { organization: { name: string }; admin: { email: string } };
}
