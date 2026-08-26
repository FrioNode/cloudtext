import { ApiProperty } from '@nestjs/swagger'

export class RequestAccountDeletionDto {
  @ApiProperty({
    type: String,
    required: true,
    description: 'Why you are closing the account.',
  })
  message: string

  @ApiProperty({
    type: String,
    required: true,
    description: 'Cloudflare Turnstile token from the form.',
  })
  turnstileToken: string
}

export class SupportMessageResponseDTO {
  @ApiProperty({
    type: String,
    description: 'Confirmation that the request was recorded.',
    example: 'Support request submitted successfully',
  })
  message: string
}
