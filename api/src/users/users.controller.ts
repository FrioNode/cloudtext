import { Controller } from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'

// No routes yet, so it would otherwise show up as an empty tag in the docs.
@ApiExcludeController()
@Controller('users')
export class UsersController {}
