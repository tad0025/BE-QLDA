import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './entities/movie.entity';
import { MovieController } from './movie.controller';
import { MovieService } from './movie.service';
import { AuthModule } from '../auth/auth.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [TypeOrmModule.forFeature([Movie]), AuthModule, CloudinaryModule],
  controllers: [MovieController],
  providers: [MovieService],
})
export class MovieModule {}
