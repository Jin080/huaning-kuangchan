import { IsArray, IsOptional, IsString } from 'class-validator';

export class MarkSignedDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}
