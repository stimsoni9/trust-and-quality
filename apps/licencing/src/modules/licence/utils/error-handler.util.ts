import { BadRequestException } from '@nestjs/common';

/**
 * Centralized error handling utility to eliminate duplicate error handling patterns
 * Provides consistent error responses across the licence module
 */
export class ErrorHandler {
  
  /**
   * Handle service errors with consistent pattern
   * Used across multiple controller methods to avoid duplication
   */
  static handleServiceError(error: unknown, context: string): never {
    // Re-throw BadRequestException as-is (already formatted correctly)
    if (error instanceof BadRequestException) {
      throw error;
    }
    
    // Convert other Error instances to BadRequestException with context
    if (error instanceof Error) {
      throw new BadRequestException(`${context} failed: ${error.message}`);
    }
    
    // Handle unknown error types
    throw new BadRequestException(`${context} failed: Unknown error occurred`);
  }

  /**
   * Handle validation errors specifically
   * Used for input validation failures
   */
  static handleValidationError(error: unknown, context: string): never {
    if (error instanceof BadRequestException) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new BadRequestException(`${context} validation failed: ${errorMessage}`);
  }

  /**
   * Handle filter parsing errors specifically
   * Used for batch endpoint filter parameter issues
   */
  static handleFilterError(error: unknown): never {
    if (error instanceof BadRequestException) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new BadRequestException(`Filter validation failed: ${errorMessage}`);
  }
}
