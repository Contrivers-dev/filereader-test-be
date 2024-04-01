import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
  Req,
  Get,
  Body,
  Query,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Multer } from "multer";
import { PhonebookService } from "./phonebook.service";
import { diskStorage } from "multer";

@Controller("sheets")
export class PhonebookController {
  constructor(private readonly phonebookService: PhonebookService) {}

  @Post("adminUpload/:user_id")
  @UseInterceptors(FileInterceptor("file"))
  async uploadFile(
    @Query("user_id") userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const savedFileName = await this.phonebookService.saveFile(
      file,
      "admin",
      userId,
    );
    return { filename: savedFileName };
  }

  @Post("userUpload/:user_id")
  @UseInterceptors(FileInterceptor("file"))
  async uploadUserFile(
    @Query("user_id") userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const savedObject = await this.phonebookService.saveFile(file, "", userId);
    return savedObject;
  }
}
