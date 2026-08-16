# Integração com sistema de facturação externo

Este documento descreve o contrato de integração entre o EMIR SAÚDE
SEGUROS e um sistema de facturação externo separado (ex: um sistema de
facturação geral/comercial). É diferente do módulo "Facturação" já
existente no EMIR SAÚDE SEGUROS, que é específico para facturação de
**prestadores de saúde** (glosas, serviços médicos).

## 1. Autenticação

O sistema externo autentica-se com uma **chave de integração**, criada em
**Integrações** (menu lateral do EMIR SAÚDE SEGUROS) por um administrador.
A chave é mostrada uma única vez no momento da criação — nunca é possível
recuperá-la depois.

Todos os pedidos devem incluir:
```
Authorization: Bearer <chave>
```

## 2. Enviar uma factura (webhook, do sistema externo para aqui)

```
POST https://emir-saude-backend.onrender.com/api/integrations/invoices/webhook
Authorization: Bearer <chave>
Content-Type: application/json

{
  "externalId": "FAT-001",
  "invoiceNumber": "FAT-2026-001",
  "customerName": "Nome do Cliente",
  "customerTaxId": "5001234567",
  "issueDate": "2026-08-16",
  "dueDate": "2026-09-15",
  "totalValue": 15000,
  "status": "issued",
  "items": [
    { "description": "Produto X", "quantity": 2, "unitValue": 7500, "totalValue": 15000 }
  ]
}
```

Campos obrigatórios: `externalId`, `invoiceNumber`, `customerName`,
`issueDate`, `totalValue`, `status` (`draft` | `issued` | `paid` |
`cancelled`). `dueDate`, `customerTaxId` e `items` são opcionais.

**Idempotência**: reenviar o mesmo `externalId` **actualiza** o registo
existente — nunca cria um duplicado. É seguro reenviar sempre que o estado
da factura mudar (ex: passou a "paid").

Resposta (sucesso, código 201):
```json
{ "success": true, "message": "Factura recebida com sucesso.", "data": { "id": "...", ... } }
```

## 3. Consultar facturas (do EMIR SAÚDE SEGUROS para o sistema externo)

Não existe, por agora, um endpoint dedicado para o sistema externo LER
dados do EMIR SAÚDE SEGUROS — a integração está desenhada para o sentido
"o sistema de facturação envia, o EMIR SAÚDE SEGUROS recebe e guarda". Se
for preciso o sentido inverso (o sistema de facturação consultar dados do
EMIR SAÚDE SEGUROS), isso será um novo endpoint, a definir quando for
necessário.

## 4. Boas práticas para o sistema externo

- **Nunca enviar dados clínicos ou de saúde** — só dados comerciais
  (cliente, valores, datas, estado). Os dois sistemas têm finalidades
  diferentes e essa separação é intencional.
- Tratar um código de resposta `401` como "chave inválida ou revogada" —
  nesse caso, é preciso gerar uma chave nova em Integrações.
- Tratar um código de resposta `400` como "dados em falta ou mal
  formatados" — o corpo da resposta inclui o campo `errors` com o detalhe.
- Reenviar em caso de falha de rede é seguro, graças à idempotência.

## 5. Gestão de chaves (equipa EMIR SAÚDE SEGUROS)

Em **Integrações** (menu lateral, requer permissão `integrations.manage`):
- Criar uma chave nova (dá-lhe um nome identificável, ex: "sistema de facturação")
- Ver quando foi usada pela última vez
- Revogar uma chave a qualquer momento (efeito imediato)

As facturas já recebidas aparecem na mesma página (requer permissão
`integrations.view`).
