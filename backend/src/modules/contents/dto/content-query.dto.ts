import { ContentCategory, ContentStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PublicContentQueryDto {
  @IsOptional()
  @IsEnum(ContentCategory)
  category?: ContentCategory;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;
}

export class AdminContentQueryDto extends PublicContentQueryDto {
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}
