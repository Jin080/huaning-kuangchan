import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class BlacklistQueryDto {
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

export class CreateBlacklistDto {
  @IsString()
  enterpriseId!: string;

  @IsOptional()
  @IsString()
  lotId?: string;

  @IsString()
  reason!: string;
}

export class ReleaseBlacklistDto {
  @IsOptional()
  @IsString()
  releaseReason?: string;
}
