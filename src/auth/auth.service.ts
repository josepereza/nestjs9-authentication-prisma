import { ForbiddenException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon from 'argon2';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime';
import { AuthDto, EmailDto, PasswordDto } from './dto';
import { MailService } from 'src/mail/mail.service';
import { createHash, randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private readonly mailservice: MailService,
  ) {}

  //! registering the user
  async signup(dto: AuthDto) {
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

      //^ send welcome email
      await this.mailservice.sendWelcomeMail(user.email, dto.fullName);

      //^ return the token
      return this.generateToken(user.id);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ForbiddenException('Credentials taken');
        }
      }
      throw error;
    }
  }

  //! signin the user
  async signin(dto: AuthDto) {
    try {
      //^ checking if user exist with given email
      const user = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      //^ checking if password correct
      const isPwCorrect = await argon.verify(user.password, dto.password);

      //^ if user does not exist or password incorrect throw exception
      if (!user || !isPwCorrect)
        throw new ForbiddenException('Credentials incorrect!');

      //^ return the token
      return this.generateToken(user.id);
    } catch (error) {
      throw error;
    }
  }

  //! forgetPassword -- sending email
  async forgetPassword(dto: EmailDto) {
    try {
      //^ checking if user exist with given email
      const user = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (!user)
        throw new ForbiddenException('User does not exist with given email!');

      //^ generate reset token
      const token = randomBytes(12).toString('hex');
      const hashedToken = createHash('md5').update(token).digest('hex');

      //^ update user
      await this.prisma.user.update({
        where: {
          email: dto.email,
        },
        data: {
          resetToken: hashedToken,
          tokenValidTime: Date.now() + 15 * 60 * 1000,
        },
      });

      //^ sending email
      await this.mailservice.sendUserConfirmation(dto.email, token);

      return {
        message: 'Email sent!',
      };
    } catch (error) {
      throw error;
    }
  }

  //! resetPassword by given token
  async resetPassword(token: string, dto: PasswordDto) {
    try {
      //^ hashing token for comparing
      const hashedToken = createHash('md5').update(token).digest('hex');

      //^ check if token valid
      const user = await this.prisma.user.findFirst({
        where: {
          resetToken: hashedToken,
          tokenValidTime: {
            gt: Date.now() + 15 * 60 * 100,
          },
        },
      });

      if (!user) throw new ForbiddenException('Token expired or invalid!');

      //^ hash new password
      const hashedPassword = await argon.hash(dto.password);

      //^ update user
      const updatedUser = await this.prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: hashedPassword,
          resetToken: null,
          tokenValidTime: null,
        },
      });

      return this.generateToken(updatedUser.id);
    } catch (error) {
      throw error;
    }
  }

  //! genereting token
  async generateToken(userId: number): Promise<{ token: string }> {
    const payload = {
      sub: userId,
    };

    const token = await this.jwt.signAsync(payload, {
      expiresIn: this.config.get('JWT_EXPIRES'),
      secret: this.config.get('JWT_SECRET'),
    });
    return {
      token,
    };
  }
}
