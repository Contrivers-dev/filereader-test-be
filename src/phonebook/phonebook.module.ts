import { Module, MiddlewareConsumer } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthMiddleware } from "src/middlewares/auth.middleware";
import { Phonebook } from "./phonebook.entity";
import { User } from "src/auth/user.entity";
import { Uploads } from "src/uploads/uploads.entity";
import { PhonebookController } from "./phonebook.controller";
import { PhonebookService } from "./phonebook.service";
import { JwtModule } from "@nestjs/jwt";
import * as dotenv from "dotenv";
dotenv.config();
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET, // Use a secure way to manage secrets
      signOptions: { expiresIn: "60m" },
    }),
    TypeOrmModule.forFeature([Phonebook, User, Uploads]),
  ],
  controllers: [PhonebookController],
  providers: [PhonebookService],
})
export class PhonebookModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        "sheets/upload/:id",
        "sheets/adminUpload/",
        "sheets/userUpload/"
      );
  }
}
