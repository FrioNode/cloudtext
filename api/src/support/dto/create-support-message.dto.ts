import { ApiHideProperty, ApiProperty } from '@nestjs/swagger'
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator'

export enum SupportCategory {
  GENERAL = 'general',
  TECHNICAL = 'technical',
  BILLING_AND_PAYMENTS = 'billing-and-payments',
  ACCOUNT_DELETION = 'account-deletion',
  OTHER = 'other',
}

export class CreateSupportMessageDto {
  // Always taken from the token, never from the body.
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  user?: string

  @ApiProperty({
    type: String,
    required: true,
    description: 'Your name, so support knows who is asking.',
  })
  @IsNotEmpty()
  @IsString()
  name: string

  @ApiProperty({
    type: String,
    required: true,
    description: 'Email address to reply to. The confirmation goes here.',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string

  @ApiProperty({
    type: String,
    required: false,
    description: 'Phone number, if you want to be called back.',
  })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiProperty({
    enum: SupportCategory,
    required: true,
    description: 'What the request is about.',
  })
  @IsNotEmpty()
  @IsEnum(SupportCategory)
  category: SupportCategory

  @ApiProperty({
    type: String,
    required: true,
    description: 'What you need help with.',
  })
  @IsNotEmpty()
  @IsString()
  message: string

  @ApiProperty({
    type: String,
    required: true,
    description: 'Cloudflare Turnstile token from the support form.',
  })
  @IsNotEmpty()
  @IsString()
  turnstileToken: string

  // Read from the request, never from the body.
  @ApiHideProperty()
  @IsOptional()
  @IsString()
  ip?: string

  @ApiHideProperty()
  @IsOptional()
  @IsString()
  userAgent?: string
}
