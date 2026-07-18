import * as fs from 'fs';
import * as path from 'path';

// Resolve o caminho de um ficheiro em backend/src/assets, de forma robusta
// tanto em desenvolvimento (ts-node, a correr a partir de src/) como em
// produção (JS compilado, a correr a partir de dist/src/) — e independente
// de qual módulo chama esta função ou a partir de que directoria o processo
// é iniciado.
//
// Em vez de assumir uma profundidade relativa fixa a partir de __dirname
// (frágil — depende de onde este ficheiro está e de como o `nest build`
// organiza o dist/, que pode mudar), sobe-se a árvore de directorias a
// partir deste ficheiro até encontrar o `package.json` do backend, e a
// partir daí testam-se os locais onde os assets podem estar: `dist/assets`
// (produção) e `src/assets` (desenvolvimento).
function findBackendRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

export function resolveAssetPath(relativeToSrc: string): string {
  const backendRoot = findBackendRoot(__dirname);
  const candidates = [
    path.join(backendRoot, 'dist/assets', relativeToSrc),
    path.join(backendRoot, 'src/assets', relativeToSrc),
    path.join(process.cwd(), 'dist/assets', relativeToSrc),
    path.join(process.cwd(), 'src/assets', relativeToSrc),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Nenhum candidato encontrado — devolve o primeiro mesmo assim; os
  // chamadores devem tratar a ausência do ficheiro sem falhar (ver uso com
  // try/catch nos geradores de PDF).
  return candidates[0];
}
