import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  MaxLength,
} from 'class-validator';

export class EnterpriseCertificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  contactPerson: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  contactPhone: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  mainCategory: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  legalRepresentative: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  legalRepresentativeIdNo: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  userCategory: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  userType: string;

  @IsOptional()
  @IsString()
  registeredCapital?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  region: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  unifiedSocialCreditCode: string;

  @IsString()
  @MinLength(1)
  companyProfile: string;

  @IsString()
  @MinLength(1)
  businessScope: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  paymentBankAccount: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  paymentAccountName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  paymentBankName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  paymentBankLineNo: string;

  @IsBoolean()
  paymentIsBankOfChina: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  receivingBankAccount: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  receivingAccountName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  receivingBankName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  receivingBankLineNo: string;

  @IsBoolean()
  receivingIsBankOfChina: boolean;

  @IsBoolean()
  agreementAccepted: boolean;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  qualificationFileUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  businessLicenseFileUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_tld: false })
  authorizationMaterialUrl?: string;
}

export class EnterpriseRegisterDto extends EnterpriseCertificationDto {
  @IsString()
  @MinLength(1)
  username: string;

  @IsString()
  @MinLength(1)
  password: string;

  @IsString()
  @MinLength(1)
  confirmPassword: string;
}

export class RejectEnterpriseCertificationDto {
  @IsString()
  @MinLength(1)
  rejectReason: string;
}
