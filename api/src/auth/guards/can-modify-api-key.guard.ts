import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common'
import mongoose from 'mongoose'
import { AuthService } from '../auth.service'

@Injectable()
export class CanModifyApiKey implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()

    const apiKeyId = request.params.id
    const userId = request.user?.id

    const isValidId = mongoose.Types.ObjectId.isValid(apiKeyId)
    if (!isValidId) {
      throw new HttpException({ error: 'Invalid id' }, HttpStatus.BAD_REQUEST)
    }

    if (!userId) {
      throw new HttpException({ error: 'Unauthorized' }, HttpStatus.UNAUTHORIZED)
    }

    const apiKey = await this.authService.findApiKeyById(apiKeyId)

    if (!apiKey || apiKey.user?.toString() !== userId.toString()) {
      throw new HttpException(
        { error: 'API key not found' },
        HttpStatus.NOT_FOUND,
      )
    }

    return true
  }
}
