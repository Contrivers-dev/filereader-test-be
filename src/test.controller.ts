import { Controller, Post, Body } from "@nestjs/common";
import { MailService } from "./mail/mail.service";

@Controller("mail")
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post("send")
  async sendEmail(
    @Body("email") email: string,
    @Body("subject") subject: string
  ) {
    try {
      console.log(email);
      await this.mailService.sendEmail(email, subject);
      return { message: `Email sent successfully to ${email}` };
    } catch (error) {
      return { error: error.message };
    }
  }
}
