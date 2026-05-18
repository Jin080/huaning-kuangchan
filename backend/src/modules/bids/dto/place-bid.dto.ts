import { IsDecimal, IsNotEmpty } from 'class-validator';

export class PlaceBidDto {
  @IsNotEmpty()
  @IsDecimal()
  amount!: string;
}
