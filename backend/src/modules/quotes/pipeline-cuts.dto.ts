import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
export class CreatePipelineCutDto {
  @IsUUID() request_id: string;
  @IsString() @MaxLength(1000) reason: string;
  @IsOptional() @IsUUID() supersedes_id?: string;
}
