import { MailerService } from "@nestjs-modules/mailer";
import { Injectable } from "@nestjs/common";
import { User } from "../auth/user.entity";

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendPasswordResetEmail(user: User, jwtTokwn: string, subject: string) {
    const url = `${process.env.APP_URL}/forget-password/${jwtTokwn}`;
    await this.mailerService
      .sendMail({
        to: user.email,
        subject: subject,
       
        context: {
          name: user.name,
          url,
        },
      })
      .catch((e) => {
        console.log(e);
      });
  }
  async sendEmail(email: string, subject: string) {
    console.log(email);
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: subject,
        //  template: './invite', // Assuming you have a template named 'invite.hbs' in your templates directory
        context: {
          name: "Recipient", // Example context data
          url: "https://example.com", // Example context data
        },
      });
      console.log(`Email sent successfully to ${email}`);
    } catch (error) {
      console.error(`Failed to send email to ${email}`, error);
      throw new Error(`Failed to send email to ${email}`);
    }
  }
}
