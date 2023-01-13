import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport/dist';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}
  @Post('signup')
  signup(@Body() dto: SignUpDto, @Req() req: Request) {
    console.log(req);

    return this.authService.signup(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('signin')
  signin(@Req() req: Request) {
    return req.user;
  }
}
