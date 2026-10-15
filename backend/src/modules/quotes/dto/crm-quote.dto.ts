import { IsString, IsOptional, IsNumber, IsBoolean, IsDateString, IsIn, IsInt, Min } from 'class-validator';

export class UpdateCrmQuoteDto {
  @IsOptional() @IsString()
  transition_note?: string;
  @IsOptional() @IsIn(['Llamada', 'Email', 'Reunión', 'Nota', 'Tarea'])
  transition_activity_type?: string;
  @IsOptional() @IsInt() @Min(1)
  followup_version?: number;
  @IsString()
  @IsOptional()
  @IsIn(['borrador', 'enviada', 'en negociación', 'preliminar', 'presentada', 'evaluación', 'negociación', 'aprobación', 'aceptada', 'ganada', 'perdida'])
  estado_oferta?: string;

  @IsNumber()
  @IsOptional()
  @IsIn([0, 5, 10, 20, 25, 35, 50, 55, 75, 90, 100])
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

  @IsString()
  @IsOptional()
  contacto_id?: string | null;

  @IsString()
  @IsOptional()
  contact_id?: string | null;

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
