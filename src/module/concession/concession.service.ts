import { Injectable, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConcessionProduct } from './entities/concession-product.entity';
import { CreateConcessionProductDto, UpdateConcessionProductDto } from './dto/concession.dto';
import { ApiResponse } from '../../core/dto/ApiResponse.dto';
import { CustomException } from '../../core/exceptions/custom.exception';

@Injectable()
export class ConcessionService {
  constructor(
    @InjectRepository(ConcessionProduct)
    private readonly productRepository: Repository<ConcessionProduct>,
  ) {}

  async create(dto: CreateConcessionProductDto): Promise<ApiResponse<ConcessionProduct>> {
    const product = this.productRepository.create({
      ...dto,
      stockQuantity: dto.stockQuantity ?? 0,
    });
    const saved = await this.productRepository.save(product);
    return new ApiResponse(true, 'Tạo sản phẩm bắp nước thành công', saved);
  }

  async findAll(page: number = 1, pageSize: number = 10): Promise<ApiResponse<ConcessionProduct[]>> {
    const skip = (page - 1) * pageSize;
    const [products, totalItems] = await this.productRepository.findAndCount({
      skip,
      take: pageSize,
      order: { id: 'DESC' },
    });
    const totalPages = Math.ceil(totalItems / pageSize);
    const response = new ApiResponse(true, 'Lấy danh sách sản phẩm thành công', products);
    response.pagination = { page: Number(page), pageSize: Number(pageSize), totalItems, totalPages };
    return response;
  }

  async findOne(id: number): Promise<ApiResponse<ConcessionProduct>> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm');
    }
    return new ApiResponse(true, 'Lấy thông tin sản phẩm thành công', product);
  }

  async update(id: number, dto: UpdateConcessionProductDto): Promise<ApiResponse<ConcessionProduct>> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm');
    }
    Object.assign(product, dto);
    const updated = await this.productRepository.save(product);
    return new ApiResponse(true, 'Cập nhật sản phẩm thành công', updated);
  }

  async remove(id: number): Promise<ApiResponse<null>> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new CustomException(HttpStatus.NOT_FOUND, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm');
    }
    await this.productRepository.remove(product);
    return new ApiResponse(true, 'Xóa sản phẩm thành công');
  }
}
