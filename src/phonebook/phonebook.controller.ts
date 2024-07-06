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
import csv from 'csv-parser';
import * as fs from 'fs';

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
    if (!file) {
      return {
        error: true,
        message: 'File not found',
      };
    }

    const filePath = `./uploads/${file.filename}`;
    let phoneNumbers = [];

    if (file.originalname.endsWith('.csv')) {
      phoneNumbers = await this.parseCSV(filePath);
    }
    else {
      return {
        error: true,
        message: 'Unsupported file',
      };
    }

    const uniquePhoneNumbers = [...new Set(phoneNumbers)];
    this.phonebookService.savePhoneNumbers(uniquePhoneNumbers, request['user'].id)

    return {
      error: false,
      message: 'Data Saved successfully',
    };

  }

  async parseCSV(filePath: string): Promise<any> {
    const phoneNumbers  = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          if (data.telephone) {
            phoneNumbers.push(data.telephone);
          }
        })
        .on('end', () => {
          resolve(phoneNumbers);
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }


  @Get('phoneCount')
  async getPhoneCount() {

  }

  // @Post('userUpload/:id')
  // @UseInterceptors(
  //   FileInterceptor('file', {
  //     storage: diskStorage(),
  //   })
  // )
  async updateUserSheet(
    @Param('id') id: number,
    @UploadedFile() uploadedFile: Multer.File,
  ) {
    
  }

}
