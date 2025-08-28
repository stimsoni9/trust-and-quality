import { Controller, Get } from '@nestjs/common';

@Controller('licencing')
export class HealthController {
  @Get('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}


