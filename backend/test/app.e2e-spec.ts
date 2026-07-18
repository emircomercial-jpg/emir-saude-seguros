import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Teste de integração ponta-a-ponta (secção 29 do briefing).
//
// REQUISITOS PARA CORRER ESTE TESTE:
// - Uma base de dados PostgreSQL de TESTE disponível, com DATABASE_URL no
//   backend/.env a apontar para ela (nunca para a base de produção/desenvolvimento).
// - Migrações aplicadas e seed corrido:
//     npx prisma migrate deploy
//     npx prisma db seed
//
// Corre com: npm run test:e2e
describe('Autenticação e protecção de rotas (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    const config = app.get(ConfigService);
    app.use(cookieParser(config.get<string>('cookie.secret')));
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responds without authentication (rota pública)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });

  it('rejects login with invalid credentials (login incorrecto)', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'nao-existe@emirsaude.co.ao', password: 'senha-errada' })
      .expect(401);
  });

  it('blocks unauthenticated access to a protected route (protecção de rota)', () => {
    return request(app.getHttpServer())
      .get('/api/users')
      .expect(401)
      .expect((res) => {
        expect(res.body.success).toBe(false);
      });
  });

  it('logs in with the seeded admin account and accesses a protected route (acesso entre organizações / rotas do dashboard)', async () => {
    const loginResponse = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: process.env.ADMIN_EMAIL || 'admin@emirsaude.co.ao',
        password: process.env.ADMIN_PASSWORD || '',
      });

    expect(loginResponse.status).toBe(201);
    const accessToken = loginResponse.body.data.accessToken;
    expect(accessToken).toBeDefined();

    const dashboardResponse = await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(dashboardResponse.status).toBe(200);
    expect(dashboardResponse.body.data.totalUsers).toBeGreaterThanOrEqual(1);
  });
});
