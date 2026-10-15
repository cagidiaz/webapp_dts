import { IsEmail, IsIn, IsInt, IsOptional, IsString, IsUUID, IsBoolean, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

const emptyToNull = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || null : value;

export class CreateProspectDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(255)
  company_name: string;

  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(255)
  contact_name?: string | null;

  @Transform(emptyToNull) @IsOptional() @IsEmail() @MaxLength(255)
  email?: string | null;

  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(50)
  phone?: string | null;

  @IsInt() @IsIn([0, 1])
  phase: number;
}

export class UpdateProspectDto extends CreateProspectDto {
  @IsInt() @Min(1)
  version: number;
}

export class ProspectVersionDto {
  @IsInt() @Min(1)
  version: number;
}

export class LinkProspectDto extends ProspectVersionDto {
  @IsUUID()
  client_id: string;
}

export class ProspectActivityDto {
  @IsIn(['NOTE', 'TASK', 'CALL', 'VISITA', 'EVENT', 'VIDEOLLAMADA'])
  type: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(255)
  title: string;

  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(10000)
  description?: string | null;

  @Transform(emptyToNull) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/)
  due_date?: string | null;

  @Transform(emptyToNull) @IsOptional() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  time_scheduled?: string | null;

  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(500)
  location?: string | null;

  @Transform(emptyToNull) @IsOptional() @IsString() @MaxLength(10000)
  conclusions?: string | null;

  @IsBoolean()
  is_completed: boolean;
}

export class UpdateProspectActivityDto extends ProspectActivityDto {
  @IsInt() @Min(1)
  version: number;
}
