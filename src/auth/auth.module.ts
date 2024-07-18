import { Module, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { User } from "./user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthMiddleware } from "src/middlewares/auth.middleware";
import { MailModule } from "../mail/mail.module";
import express from "express";
import { Uploads } from "src/uploads/uploads.entity";
import { JwtModule } from "@nestjs/jwt";
import * as dotenv from "dotenv";
dotenv.config();
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Use a secure way to manage secrets
      signOptions: { expiresIn: "60m" },
    }),
    TypeOrmModule.forFeature([User, Uploads]),
    MailModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        "auth/createUser",
        "auth/all-sheets",
        "auth/all-users",
        "auth/changePassword"
      );
    consumer
      .apply(express.static("uploadedFiles"))
      .forRoutes({ path: "uploadedFiles", method: RequestMethod.GET });
  }
}
