import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch(Error)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    
    // Check if it's a validation error
    if (exception.message.includes('Filter validation failed') || 
        exception.message.includes('Requirements validation failed')) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message: exception.message,
        error: 'Bad Request',
        timestamp: new Date().toISOString(),
        path: ctx.getRequest().url,
      });
    }
    
    // For other errors, return 500
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: exception.message,
      error: 'Internal Server Error',
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
    });
  }
}
