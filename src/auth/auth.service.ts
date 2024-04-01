import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { User } from "./user.entity";
import { Repository } from "typeorm";
import * as jwt from "jsonwebtoken";
import { Uploads } from "src/uploads/uploads.entity";
import { MailService } from "src/mail/mail.service";
import * as fs from "fs";
import * as path from "path";
import * as multer from "multer";
// import * as csvParser from 'csv-parser';
import * as xlsx from "xlsx";
import csvParser from "csv-parser";
import { MailerService } from "@nestjs-modules/mailer";
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Uploads)
    private readonly phonebookRepository: Repository<Uploads>,
    private readonly mailerService: MailerService,
    private mailService: MailService,
  ) {}

  async login(email: string, password: string): Promise<any> {}

  async sendPasswordResetEmail(user: User, jwtTokwn: string, subject: string) {
    const url = `${process.env.APP_URL}/change-password/${jwtTokwn}`;

    await this.mailerService
      .sendMail({
        to: user.email,
        subject: subject,
        template: "../templates/invite.hbs",
        context: {
          name: user.name,
          url,
        },
      })
      .catch((e) => {
        console.log(e);
      });
  }

  async changePassword(id: string, password: string) {}

  generatePassword(length: number = 12): string {
    const buffer = randomBytes(Math.ceil(length / 2));
    return buffer.toString("hex").slice(0, length);
  }

  async createAdminUser(): Promise<any> {
    try {
      const existingAdmin = await this.userRepository.findOne({
        where: { email: "admin@admin.com" },
      });
      if (existingAdmin) {
        return { error: true, message: "Admin user already created" };
      }

      const adminUser = this.userRepository.create({
        name: "admin",
        email: "admin@admin.com",
        password: await bcrypt.hash("1234", 10),
        role: "admin",
      });

      await this.userRepository.save(adminUser);
      return { error: false, message: "Admin user successfully created." };
    } catch (e) {
      console.log(e);
      return { error: true, message: "Admin user not created." };
    }
  }

  async createUser(
    email: string,
    name: string,
    role: string,
    uploadLimit: number,
  ) {
    try {
      if (!email || !name) {
        return {
          error: true,
          message: "All fields are required",
        };
      }
      if (role === "admin") {
        const userExists = await this.userRepository.findOne({
          where: { email },
        });
        if (userExists) {
          return { error: true, message: "User already exists" };
        }
        const user = this.userRepository.create({
          name,
          email,
          password: null,
          role: "user",
          uploadLimit,
          availableLimit: uploadLimit,
        });

        const subject = "Set your new password";
        await this.userRepository.save(user);
        await this.sendPasswordResetEmail(user, email, subject);
        return { error: false, message: "User created" };
      } else {
        return {
          error: true,
          message: "You are not allowed to perform this action.",
        };
      }
    } catch (error) {
      return { error: true, message: error?.message };
    }
  }

  async updateUser(userId: number, uploadLimit: number) {
    try {
      if (!userId || !uploadLimit) {
        return {
          error: true,
          message: "All fields are required",
        };
      }
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user) {
        return { error: true, message: "User does not exists" };
      }

      if (uploadLimit > user.uploadLimit) {
        user.availableLimit =
          user.availableLimit + (uploadLimit - user.uploadLimit);
      }

      if (uploadLimit < user.uploadLimit) {
        const temp = user.uploadLimit - uploadLimit;
        if (user.availableLimit > temp) {
          user.availableLimit = user.availableLimit - temp;
        }
      }

      user.uploadLimit = uploadLimit;
      await this.userRepository.save(user);
      return { error: false, message: "User Updated" };
    } catch (error) {
      return { error: true, message: error?.message };
    }
  }

  async GetAllSheets(role: string, id: number) {
    try {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        return {
          error: true,
          message: "User with this id not found.",
        };
      }
      const sheets = await this.phonebookRepository.find({
        relations: ["createdBy"],
      });
      return { error: false, sheets, message: "sheets fetched." };
    } catch (error) {
      return { error: true, message: error?.message };
    }
  }

  async GetAllUsers(role: string) {
    try {
      const users = await this.userRepository.find();
      return { error: false, users, message: "users fetched." };
    } catch (error) {
      return { error: true, message: error?.message };
    }
  }

  async downloadCsv(name: string, res) {}

  async deleteUser(id: number): Promise<void> {}
}
