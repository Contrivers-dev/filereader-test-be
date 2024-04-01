import {
  Controller,
  Get,
  Req,
  Res,
  Body,
  Param,
  Post,
  Put,
  Delete,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Response } from "express";
import { FileInterceptor } from "@nestjs/platform-express";
import * as fs from "fs";
import * as path from "path";
import * as multer from "multer";
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(
    @Body("email") email: string,
    @Body("password") password: string,
  ): Promise<string | { message: string }> {
    return await this.authService.login(email, password);
  }

  @Post("createAdmin")
  async createAdmin(): Promise<string | { message: string }> {
    return await this.authService.createAdminUser();
  }

  @Post("admin/createUser")
  async createUser(
    @Body("email") email: string,
    @Body("name") name: string,
    @Body("uploadLimit") uploadLimit: number,
    @Body("role") role: string,
    // @Req() request: Request,
  ): Promise<string | { message: string }> {
    return await this.authService.createUser(email, name, role, uploadLimit);
  }

  @Post("changePassword")
  async changePassword(
    @Body("id") id: string,
    @Body("password") password: string,
  ): Promise<any> {
    return await this.authService.changePassword(id, password);
  }

  @Get("/download/:fileName")
  async downloadFile(
    @Param("fileName") fileName: string,
    @Res() res,
  ): Promise<void> {
    const filePath = path.join(__dirname, "../../", "SampleFiles", fileName);
    res.download(filePath, fileName);
  }
}
