import { Module } from '@nestjs/common';
import { InsuredService } from './insured.service';
import { InsuredController } from './insured.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [InsuredController],
  providers: [InsuredService],
  exports: [InsuredService],
})
export class InsuredModule {}
