import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes, Types } from 'mongoose'
import { User } from '../../users/schemas/user.schema'

export type EmailVerificationDocument = EmailVerification & Document

@Schema({ timestamps: true })
export class EmailVerification {
  _id?: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name })
  user: User | Types.ObjectId

  @Prop({ type: String })
  verificationCode: string // hashed

  @Prop({ type: Date })
  expiresAt: Date
}

export const EmailVerificationSchema =
  SchemaFactory.createForClass(EmailVerification)
