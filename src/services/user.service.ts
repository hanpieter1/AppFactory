// Service layer for User/Account business logic
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserRepository } from '../repositories/user.repository';
import { RoleRepository } from '../repositories/role.repository';
import {
  User,
  UserWithRoles,
  CreateUserDto,
  CreateWebServiceUserDto,
  UpdateUserDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
  AdminChangePasswordDto,
  ChangeMyPasswordDto,
  UpdateMyProfileDto,
  UserType,
  UserListQuery,
  PaginatedResult,
} from '../models/user.model';
import {
  NotFoundError,
  ConflictError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
} from '../utils/errors';

const SALT_ROUNDS = 10;
const PASSWORD_MIN_LENGTH = 8;

interface ActingUserContext {
  isAdmin: boolean;
  grantableRoleIds: string[];
  roleIds: string[];
}

export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository
  ) {}

  private validatePassword(password: string): void {
    if (password.length < PASSWORD_MIN_LENGTH) {
      throw new ValidationError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain at least one uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new ValidationError('Password must contain at least one digit');
    }
  }

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const bytes = crypto.randomBytes(12);
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars[bytes[i] % chars.length];
    }
    // Ensure policy compliance: at least 1 uppercase, 1 digit
    password = 'A' + password.slice(1, 11) + '1';
    return password;
  }

  async getActingUserContext(actingUserId: string): Promise<ActingUserContext> {
    const roles = await this.userRepository.getUserRoles(actingUserId);
    const roleIds = roles.map((r) => r.id);

    if (roles.some((r) => r.name === 'Administrator')) {
      return { isAdmin: true, grantableRoleIds: [], roleIds };
    }

    const grantableRoleIds = await this.roleRepository.getGrantableRoleIdsForRoles(roleIds);
    return { isAdmin: false, grantableRoleIds, roleIds };
  }

  private assertCanAssignRoles(requestedRoleIds: string[], context: ActingUserContext): void {
    if (context.isAdmin) return;

    for (const roleId of requestedRoleIds) {
      if (!context.grantableRoleIds.includes(roleId)) {
        throw new ForbiddenError(
          'You do not have permission to assign one or more of the requested roles'
        );
      }
    }
  }

  private async assertCanManageUser(
    targetUserId: string,
    context: ActingUserContext
  ): Promise<void> {
    if (context.isAdmin) return;

    const targetRoles = await this.userRepository.getUserRoles(targetUserId);
    for (const role of targetRoles) {
      if (!context.grantableRoleIds.includes(role.id)) {
        throw new ForbiddenError('You do not have permission to manage this user');
      }
    }
  }

  async createUser(dto: CreateUserDto, actingUserId?: string): Promise<UserWithRoles> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Username is required');
    }
    this.validatePassword(dto.password);

    if (actingUserId && dto.roleIds && dto.roleIds.length > 0) {
      const context = await this.getActingUserContext(actingUserId);
      this.assertCanAssignRoles(dto.roleIds, context);
    }

    const existing = await this.userRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictError('Username already in use');
    }

    const hashedPassword = await this.hashPassword(dto.password);
    const user = await this.userRepository.create({
      name: dto.name,
      password: hashedPassword,
      fullName: dto.fullName,
      email: dto.email,
      webServiceUser: false,
      isLocalUser: true,
      userType: UserType.Internal,
    });

    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.validateAndSetRoles(user.id, dto.roleIds);
    }

    const result = await this.userRepository.findByIdWithRoles(user.id);
    return result!;
  }

  async createWebServiceUser(
    dto: CreateWebServiceUserDto,
    actingUserId?: string
  ): Promise<UserWithRoles> {
    if (!dto.name || dto.name.trim().length === 0) {
      throw new ValidationError('Username is required');
    }
    this.validatePassword(dto.password);

    if (actingUserId && dto.roleIds && dto.roleIds.length > 0) {
      const context = await this.getActingUserContext(actingUserId);
      this.assertCanAssignRoles(dto.roleIds, context);
    }

    const existing = await this.userRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictError('Username already in use');
    }

    const hashedPassword = await this.hashPassword(dto.password);
    const user = await this.userRepository.create({
      name: dto.name,
      password: hashedPassword,
      fullName: dto.fullName,
      webServiceUser: true,
      isLocalUser: true,
      userType: UserType.Internal,
    });

    if (dto.roleIds && dto.roleIds.length > 0) {
      await this.validateAndSetRoles(user.id, dto.roleIds);
    }

    const result = await this.userRepository.findByIdWithRoles(user.id);
    return result!;
  }

  async getAllUsers(query?: UserListQuery): Promise<PaginatedResult<User>> {
    return this.userRepository.findAll(query);
  }

  async getUserById(id: string): Promise<UserWithRoles> {
    const user = await this.userRepository.findByIdWithRoles(id);
    if (!user) {
      throw new NotFoundError(`User with id '${id}' not found`);
    }
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, actingUserId?: string): Promise<UserWithRoles> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`User with id '${id}' not found`);
    }

    if (actingUserId) {
      const context = await this.getActingUserContext(actingUserId);
      await this.assertCanManageUser(id, context);
    }

    await this.userRepository.update(id, dto);
    const result = await this.userRepository.findByIdWithRoles(id);
    return result!;
  }

  async updateUserRoles(
    id: string,
    dto: UpdateUserRolesDto,
    actingUserId?: string
  ): Promise<UserWithRoles> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`User with id '${id}' not found`);
    }

    if (actingUserId) {
      const context = await this.getActingUserContext(actingUserId);
      await this.assertCanManageUser(id, context);
      this.assertCanAssignRoles(dto.roleIds, context);
    }

    await this.validateAndSetRoles(id, dto.roleIds);

    const result = await this.userRepository.findByIdWithRoles(id);
    return result!;
  }

  async updateUserStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actingUserId?: string
  ): Promise<UserWithRoles> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`User with id '${id}' not found`);
    }

    if (actingUserId) {
      const context = await this.getActingUserContext(actingUserId);
      await this.assertCanManageUser(id, context);
    }

    const statusUpdate: {
      active?: boolean;
      blocked?: boolean;
      blockedSince?: Date | null;
      failedLogins?: number;
    } = {};

    if (dto.active !== undefined) {
      statusUpdate.active = dto.active;
    }

    if (dto.blocked !== undefined) {
      statusUpdate.blocked = dto.blocked;
      if (!dto.blocked) {
        // Unblocking: reset failed logins and blockedSince
        statusUpdate.failedLogins = 0;
        statusUpdate.blockedSince = null;
      }
    }

    await this.userRepository.updateStatus(id, statusUpdate);
    const result = await this.userRepository.findByIdWithRoles(id);
    return result!;
  }

  async adminChangePassword(
    id: string,
    dto: AdminChangePasswordDto,
    actingUserId?: string
  ): Promise<void> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`User with id '${id}' not found`);
    }

    if (actingUserId) {
      const context = await this.getActingUserContext(actingUserId);
      await this.assertCanManageUser(id, context);
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new ValidationError('New password and confirmation do not match');
    }
    this.validatePassword(dto.newPassword);

    const hashedPassword = await this.hashPassword(dto.newPassword);
    await this.userRepository.updatePassword(id, hashedPassword);
  }

  async resetPassword(id: string, actingUserId?: string): Promise<{ temporaryPassword: string }> {
    const existing = await this.userRepository.findById(id);
    if (!existing) {
      throw new NotFoundError(`User with id '${id}' not found`);
    }

    if (actingUserId) {
      const context = await this.getActingUserContext(actingUserId);
      await this.assertCanManageUser(id, context);
    }

    const temporaryPassword = this.generateTemporaryPassword();
    const hashedPassword = await this.hashPassword(temporaryPassword);
    await this.userRepository.updatePassword(id, hashedPassword);

    return { temporaryPassword };
  }

  async updateMyProfile(userId: string, dto: UpdateMyProfileDto): Promise<UserWithRoles> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundError(`User with id '${userId}' not found`);
    }

    await this.userRepository.update(userId, dto);
    const result = await this.userRepository.findByIdWithRoles(userId);
    return result!;
  }

  async changeMyPassword(userId: string, dto: ChangeMyPasswordDto): Promise<void> {
    const existing = await this.userRepository.findById(userId);
    if (!existing) {
      throw new NotFoundError(`User with id '${userId}' not found`);
    }

    if (dto.newPassword !== dto.confirmPassword) {
      throw new ValidationError('New password and confirmation do not match');
    }
    this.validatePassword(dto.newPassword);

    const storedHash = await this.userRepository.findPasswordHashById(userId);
    if (!storedHash) {
      throw new NotFoundError(`User with id '${userId}' not found`);
    }

    const isValid = await bcrypt.compare(dto.oldPassword, storedHash);
    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const hashedPassword = await this.hashPassword(dto.newPassword);
    await this.userRepository.updatePassword(userId, hashedPassword);
  }

  async recordLastLogin(userId: string): Promise<void> {
    await this.userRepository.updateLastLogin(userId);
  }

  private async validateAndSetRoles(userId: string, roleIds: string[]): Promise<void> {
    for (const roleId of roleIds) {
      const role = await this.roleRepository.findById(roleId);
      if (!role) {
        throw new NotFoundError(`Role with id '${roleId}' not found`);
      }
    }
    await this.userRepository.setUserRoles(userId, roleIds);
  }
}
