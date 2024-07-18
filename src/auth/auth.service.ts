import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { User } from "./user.entity";
import { MongoCompatibilityError, Repository } from "typeorm";
import * as jwt from "jsonwebtoken";
import { Uploads } from "src/uploads/uploads.entity";
import { MailService } from "src/mail/mail.service";

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Uploads)
    private readonly phonebookRepository: Repository<Uploads>,
    private mailService: MailService
  ) {}

  async login(email: string, password: string): Promise<any> {
    try {
      const Authuser = await this.userRepository.findOne({ where: { email } });
      if (Authuser) {
        console.log("User found", Authuser);

        const isPasswordValid = await bcrypt.compare(
          password,
          Authuser.password
        );
        if (!isPasswordValid) {
          throw new UnauthorizedException("User not authenticated ");
        } else {
          console.log("User authenticaated");
          const payload = {
            userId: Authuser.id,
            email: Authuser.email,
            role: Authuser.role,
          };
          const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: "1h",
          });
          return {
            token: token,
            role: Authuser.role,
          };
        }
      } else {
        throw new UnauthorizedException("User not authenticated ");
      }
    } catch (error) {
      throw new UnauthorizedException("User not authenticated ");
    }
  }

  async sendPasswordResetEmail(email: string, subject: string): Promise<any> {
    try {
      console.log(`Searching for user with email: ${email}`);
      const user = await this.userRepository.findOne({ where: { email } });
      console.log("password reset email");
      console.log("signing payload");
      const payload = { userId: user.id, email: user.email, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      console.log("making url ");
      const url = `http://localhost:8000/auth/reset?token=${token}`;
      console.log(url);
       this.mailService.sendPasswordResetEmail(email,token,"Password Reset");
      return { message:"Successfull" };
    } catch (error) {
      console.error("Error occurred while searching for user:", error);
      return { error: "NOt successfull" };
    }
  }

  async changePassword(id: number, password: string): Promise<any> {
    console.log("Entered service Chnage passwords ");

    const Requser = await this.userRepository.findOne({ where: { id } });

    if (Requser) {
      console.log("user found");
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      Requser.password = hashedPassword;
      console.log("successfully saved");
      await this.userRepository.save(Requser);
      return { message: "Password changed successfully" };
    } else {
      return { message: "Some error caused" };
    }
  }

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
    uploadLimit: number
  ) {
    if (role !== "admin") {
      console.log("role is not admin");
      return {
        error: true,

        message: "You are not allowed to perform this action.",
      };
    }

    const userExists = await this.userRepository.findOne({
      where: { email },
    });

    if (userExists) {
      console.log("user exist");
      return { message: "User already exists" };
    } else {
      const user = this.userRepository.create({
        name,
        email,
        password: null,
        role: "user",
        uploadLimit,
        availableLimit: uploadLimit,
      });
      await this.userRepository.save(user);
      console.log("data saved successfully");
      const subject = "Set your new password";
      return await this.sendPasswordResetEmail(email, subject);
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
        where: {
          createdBy: { id },
        },
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

  async downloadCsv(name: string, res): Promise<any> {}

  async deleteUser(id: number): Promise<void> {}
}
