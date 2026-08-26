import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes, Types } from 'mongoose'
import { User } from '../../users/schemas/user.schema'

export type ApiKeyDocument = ApiKey & Document

@Schema({ timestamps: true })
export class ApiKey {
  _id?: Types.ObjectId

  @Prop({ type: String })
  apiKey: string // save first few chars only [ abc123****** ]

  @Prop({ type: String, default: 'API Key' })
  name: string
  
  @Prop({ type: String })
  hashedApiKey: string

  // Deterministic hash, so a presented key resolves in one indexed lookup.
  @Prop({ type: String })
  hashedApiKeySha256?: string

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name })
  user: User | Types.ObjectId

  @Prop({ type: Number, default: 0 })
  usageCount: number

  @Prop({ type: Date })
  lastUsedAt: Date

  @Prop({ type: Date })
  revokedAt?: Date
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey)

ApiKeySchema.index({ apiKey: 1 })
// Sparse: keys issued before the sha256 migration have no value here yet.
// Unique so a bad bulk backfill fails loudly at write time, not at auth time.
ApiKeySchema.index({ hashedApiKeySha256: 1 }, { unique: true, sparse: true })
