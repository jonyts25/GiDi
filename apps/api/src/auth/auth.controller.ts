import { Body, Controller, Post, UseGuards, Req } from "@nestjs/common";
import { JwtGuard } from "./jwt.guard";
import { AuthService } from "./auth.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ✅ LOGIN (NO LO BORRES)
  @Post("login")
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  // ✅ CHANGE PASSWORD (protegido)
  @Post("change-password")
  @UseGuards(JwtGuard)
  async changePassword(
    @Req() req: any,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    return this.authService.changePassword(
      req.user.sub,
      body.currentPassword,
      body.newPassword
    );
  }
}
