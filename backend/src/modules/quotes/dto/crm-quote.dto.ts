import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString, IsIn, IsUUID } from 'class-validator';

export class UpdateCrmQuoteDto {
  @IsString()
  @IsOptional()
  @IsIn(['borrador', 'enviada', 'en negociación', 'ganada', 'perdida'])
  estado_oferta?: string;

  @IsNumber()
  @IsOptional()
  @IsIn([10, 25, 50, 75, 100])
  probabilidad_exito?: number;

  @IsString()
  @IsOptional()
  @IsIn(['proyecto', 'cliente nuevo', 'cliente existente'])
  oferta_type?: string;

  @IsDateString()
  @IsOptional()
  cierreprev_date?: string;

  @IsDateString()
  @IsOptional()
  confirmacion_date?: string;

  @IsString()
  @IsOptional()
  motivo_ganada?: string;

  @IsString()
  @IsOptional()
  motivo_perdida?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsUUID()
  @IsOptional()
  contact_id?: string;

  @IsString()
  @IsOptional()
  contacto_nombre?: string;

  @IsString()
  @IsOptional()
  contacto_email?: string;

  @IsString()
  @IsOptional()
  contacto_telefono?: string;

  @IsString()
  @IsOptional()
  proxima_accion?: string;

  @IsDateString()
  @IsOptional()
  fecha_proxima_accion?: string;
}

export class CreateActivityDto {
  @IsString()
  @IsIn(['Llamada', 'Email', 'Reunión', 'Nota', 'Tarea'])
  tipo: string;

  @IsString()
  notas: string;

  @IsDateString()
  fecha: string;

  @IsBoolean()
  @IsOptional()
  hecho?: boolean;
}

export class UpdateActivityDto {
  @IsString()
  @IsOptional()
  @IsIn(['Llamada', 'Email', 'Reunión', 'Nota', 'Tarea'])
  tipo?: string;

  @IsString()
  @IsOptional()
  notas?: string;

  @IsDateString()
  @IsOptional()
  fecha?: string;

  @IsBoolean()
  @IsOptional()
  hecho?: boolean;
}
