import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class DepositVoucherDto {
  @IsString()
  @MinLength(1)
  voucherFileName: string;

  @IsString()
  @IsUrl({ require_tld: false })
  voucherFileUrl: string;

  @IsOptional()
  @IsString()
  paidAmount?: string;
}

export class RejectDepositVoucherDto {
  @IsString()
  @MinLength(1)
  rejectReason: string;
}
