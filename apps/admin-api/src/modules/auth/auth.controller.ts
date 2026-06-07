import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import { LoginRequestSchema } from '@enterprise/api-contracts';
import { CurrentUser, RequestUser } from '../../common/current-user';
import { ok } from '../../common/response';
import { Public } from '../../common/permissions.decorator';
import { createZodDto } from '../../common/zod.dto';
import { AuthService } from './auth.service';

class LoginDto extends createZodDto(LoginRequestSchema) {}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    const input = LoginRequestSchema.parse(body);
    return ok(await this.auth.login(input.username, input.password));
  }

  @Post('logout')
  logout() {
    return ok({ loggedOut: true });
  }

  @Get('me')
  async me(@CurrentUser() user: RequestUser) {
    return ok(await this.auth.me(user.id));
  }
}
