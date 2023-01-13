import { Injectable } from '@nestjs/common';
import { SignUpDto } from './dto';

@Injectable()
export class AuthService {
  signup(dto: SignUpDto) {
    return { dto };
  }
}
