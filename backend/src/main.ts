import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser: false — configuramos manualmente os limites de tamanho das
  // requisições (secção 24: "Limite de tamanho das requisições").
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const isProduction = config.get<string>('nodeEnv') === 'production';

  // Segurança de cabeçalhos HTTP.
  app.use(helmet());

  // Limite de tamanho das requisições — protege contra payloads excessivos.
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // Refresh Token em cookie HTTP-only (secção 7) — precisa do cookie-parser
  // com o segredo configurado para cookies assinados.
  app.use(cookieParser(config.get<string>('cookie.secret')));

  // CORS configurável por ambiente, com credenciais (necessário para cookies).
  app.enableCors({
    origin: config.get<string>('cors.origin'),
    credentials: true,
  });

  // Prefixo global da API.
  app.setGlobalPrefix('api');

  // Documentação Swagger, desactivável em produção (secção 24 e variável
  // SWAGGER_ENABLED do .env).
  if (config.get<boolean>('swagger.enabled') && !isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(config.get<string>('app.name') || 'EMIR SAÚDE SEGUROS')
      .setDescription('Documentação da API — EMIR PHARMA JULIETA LDA')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger disponível em /api/docs');
  }

  const port = config.get<number>('port') || 3000;
  await app.listen(port);
  logger.log(`${config.get<string>('app.name')} — API a correr na porta ${port} (${config.get<string>('nodeEnv')})`);
}

bootstrap();
