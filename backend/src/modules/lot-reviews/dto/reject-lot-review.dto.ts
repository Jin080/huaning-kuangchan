import { IsString, MinLength } from 'class-validator';

export class RejectLotReviewDto {
  @IsString()
  @MinLength(1)
  rejectReason: string;
}
