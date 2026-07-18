import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

// Filtro global de excepções (secção 24 e 25 do briefing).
// Converte qualquer erro — HttpException do Nest ou excepção não tratada —
// no padrão de resposta de erro definido:
// { success: false, message, errors, statusCode, timestamp, path }
//
// Em produção, os detalhes internos de erros não esperados (500) nunca são
// expostos ao cliente — apenas registados nos logs do servidor.
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isProduction = process.env.NODE_ENV === 'production';

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Ocorreu um erro inesperado. Tente novamente mais tarde.';
    let errors: string[] = [];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const body = exceptionResponse as { message?: string | string[]; error?: string };
        if (Array.isArray(body.message)) {
          // Erros de validação do class-validator chegam como array de mensagens.
          message = 'Foram encontrados erros de validação.';
          errors = body.message;
        } else {
          message = body.message || body.error || message;
        }
      }
    } else if (exception instanceof Error) {
      // Excepção não tratada — nunca expor o stack trace ou a mensagem interna
      // ao cliente em produção; em desenvolvimento, ajuda a depurar mais depressa.
      this.logger.error(exception.message, exception.stack);
      if (!isProduction) {
        message = exception.message;
      }
    }

    if (statusCode >= 500) {
      this.logger.error(`[${request.method}] ${request.url} → ${statusCode}: ${message}`);
    }

    response.status(statusCode).json({
      success: false,
      message,
      errors,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
