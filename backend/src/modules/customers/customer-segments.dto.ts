import { IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class SaveCustomerSegmentDto {
  @IsOptional()
  @IsString()
  @Matches(/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/, { message: 'La potencialidad debe ser un importe positivo o cero, con hasta dos decimales.' })
  potential_amount?: string | null;

  @IsInt() @Min(0)
  version: number;
}
