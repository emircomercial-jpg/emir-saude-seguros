// Extracção simples de informação do dispositivo a partir do User-Agent,
// sem depender de bibliotecas externas (secção 27: "não usar bibliotecas
// inventadas" — mantemos apenas heurísticas simples e bem conhecidas).
export interface DeviceInfo {
  deviceType: string; // desktop | mobile | tablet | unknown
  browser: string;
  operatingSystem: string;
}

export function parseDeviceInfo(userAgent: string | undefined): DeviceInfo {
  const ua = userAgent || '';

  let deviceType = 'desktop';
  if (/Tablet|iPad/i.test(ua)) deviceType = 'tablet';
  else if (/Mobi|Android(?!.*Tablet)|iPhone/i.test(ua)) deviceType = 'mobile';

  let operatingSystem = 'unknown';
  if (/Windows/i.test(ua)) operatingSystem = 'Windows';
  else if (/Mac OS X/i.test(ua)) operatingSystem = 'macOS';
  else if (/Android/i.test(ua)) operatingSystem = 'Android';
  else if (/iPhone|iPad|iOS/i.test(ua)) operatingSystem = 'iOS';
  else if (/Linux/i.test(ua)) operatingSystem = 'Linux';

  let browser = 'unknown';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  return { deviceType, browser, operatingSystem };
}
