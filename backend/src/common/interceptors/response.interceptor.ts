import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Padrão de resposta de sucesso (secção 25 do briefing):
// { success: true, message: "...", data: {}, meta: {} }
//
// Se o próprio controller já devolver um objecto com "success" definido
// (ex.: um resultado que decidiu construir a resposta manualmente), o
// interceptor respeita-o e não o envolve de novo.
export interface ApiSuccessResponse<T> {
  success: true;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((result) => {
        if (result && typeof result === 'object' && 'success' in result) {
          return result;
        }

        // Permite que o controller devolva { data, message, meta } para
        // personalizar a mensagem/metadados sem perder o envelope padrão.
        if (result && typeof result === 'object' && 'data' in result && 'message' in result) {
          const { data, message, meta } = result as any;
          return { success: true, message, data, meta };
        }

        return {
          success: true,
          message: 'Operação realizada com sucesso.',
          data: result ?? null,
        };
      }),
    );
  }
}
