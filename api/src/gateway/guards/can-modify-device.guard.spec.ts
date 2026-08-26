import { HttpException, HttpStatus } from '@nestjs/common'
import { ExecutionContext } from '@nestjs/common'
import { CanModifyDevice } from './can-modify-device.guard'
import { GatewayService } from '../gateway.service'
import { UserRole } from '../../users/user-roles.enum'

const VALID_ID = '507f1f77bcf86cd799439011'

const contextFor = (request: any): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext

describe('CanModifyDevice', () => {
  let guard: CanModifyDevice
  let gatewayService: { getDeviceById: jest.Mock }

  beforeEach(() => {
    gatewayService = { getDeviceById: jest.fn() }
    guard = new CanModifyDevice(gatewayService as unknown as GatewayService)
  })

  // The service performs the ownership check: the second argument scopes the
  // lookup to the owner, so a foreign or unknown device comes back null.
  const scopedLookupFor = (ownerId: string) =>
    async (_id: string, userId?: string) =>
      userId === ownerId ? { user: ownerId } : null

  it('allows the owner of the device', async () => {
    gatewayService.getDeviceById.mockImplementation(scopedLookupFor('user_1'))
    const request = { params: { id: VALID_ID }, user: { id: 'user_1' } }

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true)
    expect(gatewayService.getDeviceById).toHaveBeenCalledWith(
      VALID_ID,
      'user_1',
    )
  })

  it('rejects a non-owner (cross-tenant access)', async () => {
    gatewayService.getDeviceById.mockImplementation(scopedLookupFor('owner'))
    const request = { params: { id: VALID_ID }, user: { id: 'attacker' } }

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    })
    expect(gatewayService.getDeviceById).toHaveBeenCalledWith(
      VALID_ID,
      'attacker',
    )
  })

  it('rejects a request with no authenticated user id', async () => {
    const request = { params: { id: VALID_ID }, user: {} }

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
    })
    expect(gatewayService.getDeviceById).not.toHaveBeenCalled()
  })

  it("scopes an admin to their own devices like any other user", async () => {
    gatewayService.getDeviceById.mockImplementation(scopedLookupFor('owner'))
    const request = {
      params: { id: VALID_ID },
      user: { id: 'someone-else', role: UserRole.ADMIN },
    }

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    })
    expect(gatewayService.getDeviceById).toHaveBeenCalledWith(
      VALID_ID,
      'someone-else',
    )
  })

  it('throws 400 for an invalid device id', async () => {
    const request = { params: { id: 'not-an-objectid' }, user: { id: 'user_1' } }

    await expect(guard.canActivate(contextFor(request))).rejects.toThrow(
      HttpException,
    )
    expect(gatewayService.getDeviceById).not.toHaveBeenCalled()
  })

  it('rejects when the device does not exist', async () => {
    gatewayService.getDeviceById.mockResolvedValue(null)
    const request = { params: { id: VALID_ID }, user: { id: 'user_1' } }

    await expect(guard.canActivate(contextFor(request))).rejects.toMatchObject({
      status: HttpStatus.NOT_FOUND,
    })
  })
})
