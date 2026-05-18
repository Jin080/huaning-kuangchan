import { AttachmentCategory } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class FileUploadDto {
  @IsEnum(AttachmentCategory)
  category: AttachmentCategory;

  @IsOptional()
  @IsUUID()
  lotId?: string;

  @IsOptional()
  @IsUUID()
  enterpriseId?: string;
}
