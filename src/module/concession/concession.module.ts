import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConcessionProduct } from './entities/concession-product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConcessionProduct])],
})
export class ConcessionModule {}
