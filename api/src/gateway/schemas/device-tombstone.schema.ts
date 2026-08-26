import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, SchemaTypes, Types } from 'mongoose'
import { User } from '../../users/schemas/user.schema'

export type DeviceTombstoneDocument = DeviceTombstone & Document

@Schema({ timestamps: true })
export class DeviceTombstone {
  _id?: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, required: true, unique: true, index: true })
  deviceId: Types.ObjectId

  @Prop({ type: SchemaTypes.ObjectId, ref: User.name, required: true, index: true })
  userId: User | Types.ObjectId

  @Prop({ type: Date, required: true })
  deletedAt: Date
}

export const DeviceTombstoneSchema =
  SchemaFactory.createForClass(DeviceTombstone)

DeviceTombstoneSchema.index({ userId: 1, deletedAt: -1 })

