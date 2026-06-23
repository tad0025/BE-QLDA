import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConcessionProduct } from './entities/concession-product.entity';
import { ConcessionService } from './concession.service';
import { ConcessionController } from './concession.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConcessionProduct]),
    AuthModule,
  ],
  controllers: [ConcessionController],
  providers: [ConcessionService],
  exports: [ConcessionService],
})
export class ConcessionModule {}
