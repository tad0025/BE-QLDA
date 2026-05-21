import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import 'multer';
import * as streamifier from 'streamifier';
import { ENV_VARS } from 'src/constants/env.constants';

@Injectable()
export class CloudinaryService {
  private readonly folder: string;

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>(
        ENV_VARS.CLOUDINARY_CLOUD_NAME,
      ),
      api_key: this.configService.get<string>(ENV_VARS.CLOUDINARY_API_KEY),
      api_secret: this.configService.get<string>(
        ENV_VARS.CLOUDINARY_API_SECRET,
      ),
    });

    this.folder =
      this.configService.get<string>(ENV_VARS.CLOUDINARY_FOLDER) || 'qlda';
  }

  uploadImage(file: Express.Multer.File): Promise<UploadApiResponse> {
    if (!file.mimetype.startsWith('image/')) {
      throw new InternalServerErrorException('File upload phải là ảnh');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: this.folder, resource_type: 'image' },
        (error, result) => {
          if (error || !result) {
            return reject(
              new InternalServerErrorException('Upload Cloudinary thất bại'),
            );
          }
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
