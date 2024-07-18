import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { databaseConfig } from "./config/database.config";
import { PhonebookModule } from "./phonebook/phonebook.module";
import { MailController } from "./test.controller";
import { MailModule } from "./mail/mail.module";
@Module({
  imports: [
    MailModule,
    AuthModule,
    PhonebookModule,
    TypeOrmModule.forRoot(databaseConfig),
  ],
  controllers: [AppController, MailController],
  providers: [AppService],
})
export class AppModule {}
