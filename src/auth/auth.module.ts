import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import express from 'express';
import { AuthMiddleware } from 'src/middlewares/auth.middleware';
import { Uploads } from 'src/uploads/uploads.entity';
import { MailModule } from '../mail/mail.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { jwtConstants } from './constants';
import { JwtStrategy } from './Strategies/jwt.strategy';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Uploads]), MailModule, JwtModule.register({
    secret: jwtConstants.secret,
    signOptions: { expiresIn: '500d' },
  }),],
  controllers: [AuthController],
  providers: [AuthService, JwtService, JwtStrategy,],
})
export class AuthModule
{
  configure(consumer: MiddlewareConsumer)
  {
    consumer
      .apply(AuthMiddleware)
      .forRoutes('auth/createUser', 'auth/all-sheets', 'auth/all-users');
    consumer
      .apply(express.static('uploadedFiles'))
      .forRoutes({ path: 'uploadedFiles', method: RequestMethod.GET });
  }
}
