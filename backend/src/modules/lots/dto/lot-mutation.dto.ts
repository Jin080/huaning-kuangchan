import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LotMutationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsUrl({ require_tld: false })
  imageOneUrl: string;

  @IsString()
  @IsUrl({ require_tld: false })
  imageTwoUrl: string;

  @IsString()
  startPrice: string;

  @IsString()
  quantity: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  quantityUnit?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  supplier: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  origin: string;

  @IsDateString()
  deadlineAt: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  deliveryMethod: string;

  @IsString()
  @MinLength(1)
  productInfo: string;

  @IsString()
  @MinLength(1)
  productDetail: string;

  @IsString()
  @IsUrl({ require_tld: false })
  inspectionReportUrl: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  mineralCategory?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  grade?: string;

  @IsOptional()
  @IsString()
  assessedPrice?: string;

  @IsOptional()
  @IsString()
  depositRatio?: string;

  @IsString()
  depositAmount: string;

  @IsString()
  bidIncrement: string;

  @IsDateString()
  announcementStartAt: string;

  @IsDateString()
  announcementEndAt: string;

  @IsDateString()
  biddingStartAt: string;

  @IsDateString()
  biddingEndAt: string;

  @IsString()
  @MinLength(1)
  customerNotice: string;

  @IsOptional()
  @IsBoolean()
  extensionEnabled?: boolean;

  @IsOptional()
  @IsString()
  extensionRule?: string;
}
