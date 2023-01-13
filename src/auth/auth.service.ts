import { Injectable } from '@nestjs/common';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { SignUpDto } from './dto';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}
  async signup(dto: SignUpDto) {
    try {
      //^ hash password
      const hashedPassword = await argon.hash(dto.password);

      //^ save user in db
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          fullName: dto.fullName,
        },
      });

      //^ return token

      return { dto };
    } catch (error) {
      return error;
    }
  }
}
