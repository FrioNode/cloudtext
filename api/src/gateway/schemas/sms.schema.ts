import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes, Types } from 'mongoose'
import { Device } from './device.schema'
import { SMSBatch } from './sms-batch.schema'
import { User } from '../../users/schemas/user.schema'

export type SMSDocument = SMS & Document

@Schema({ timestamps: true })
export class SMS {
  _id?: Types.ObjectId

  // No single-field index: user is the prefix of two compound indexes below
  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true })
  user: User | Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, ref: Device.name, required: true })
  device: Device | Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, ref: SMSBatch.name })
  smsBatch: SMSBatch | Types.ObjectId

  @Prop({ type: String })
  message: string

  @Prop({ type: Boolean, default: false })
  encrypted: boolean

  @Prop({ type: String })
  encryptedMessage: string

  @Prop({ type: String, required: true })
  type: string

  // fields for incoming messages
  @Prop({ type: String })
  sender: string

  @Prop({ type: Date })
  receivedAt: Date

  // fields for outgoing messages
  @Prop({ type: String })
  recipient: string

  @Prop({ type: Date })
  requestedAt: Date

  // When the queue is due to hand this message to the push service; set for
  // queued messages that wait server-side first (paced waves, scheduled sends)
  @Prop({ type: Date })
  dispatchDueAt?: Date

  @Prop({ type: Date })
  dispatchedAt: Date

  @Prop({ type: Date })
  sentAt: Date

  @Prop({ type: Date })
  deliveredAt: Date

  @Prop({ type: Date })
  failedAt: Date
  
  @Prop({ type: String, required: false })
  errorCode: string

  @Prop({ type: String, required: false })
  errorMessage: string

  // @Prop({ type: String })
  // failureReason: string

  @Prop({ type: String, default: 'pending' })
  status:
    | 'pending'
    | 'dispatched'
    | 'sent'
    | 'delivered'
    | 'failed'
    | 'unknown'
    | 'received'

  @Prop({ type: Number, required: false })
  simSubscriptionId?: number

  // misc metadata for debugging
  @Prop({ type: Object })
  metadata: Record<string, any>

  // set by { timestamps: true }; declared here for typing only, no @Prop
  createdAt?: Date
  updatedAt?: Date
}

export const SMSSchema = SchemaFactory.createForClass(SMS)


SMSSchema.index({ device: 1, type: 1, receivedAt: -1 })
SMSSchema.index({ user: 1, createdAt: -1, type: 1 })
// Serves account-level keyset pagination: the sort is (createdAt, _id) and no
// other index can supply it. Build on Atlas before deploying; autoIndex would
// otherwise build it at boot.
SMSSchema.index({ user: 1, createdAt: -1, _id: -1 })
