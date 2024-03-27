import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
  Req,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Multer } from 'multer';
import { PhonebookService } from './phonebook.service';
import { diskStorage } from 'multer';

@Controller('sheets')
export class PhonebookController {
  constructor(private readonly phonebookService: PhonebookService) { }

  @Post('adminUpload/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage(),
    }),
  )
  async ImportCSV(
    @Param('id') id: number,
    @UploadedFile() file: Multer.File,
    @Req() request: Request,
  ) {

  }

  @Get('phoneCount')
  async getPhoneCount() {

  }

  @Post('userUpload/:id')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage(),
    })
  )
  async updateUserSheet(
    @Param('id') id: number,
    @UploadedFile() uploadedFile: Multer.File,
  ) {
    
  }

}
