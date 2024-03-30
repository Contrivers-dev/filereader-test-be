import
{
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PhonebookService } from './phonebook.service';

@Controller('sheets')
export class PhonebookController
{
  constructor(private readonly phonebookService: PhonebookService) { }

  @Post('adminUpload/:id')
  @UseInterceptors(FileInterceptor('file'))
  async ImportCSV(
    @Param('id') id: number, @UploadedFile() file: Express.Multer.File, @Req() request: Request,)
  {

    const phoneNumbers = await this.phonebookService.extractPhoneNumbersFromCsv(file.buffer);

    console.log("Phone Numbee", phoneNumbers);

    const [totalCount, totalDuplicates, uniqueNumbers] = await this.phonebookService.adminUpload(phoneNumbers);
    return { totalCount, totalDuplicates, uniqueNumbers };
  }


  @Get('phoneCount')
  async getPhoneCount()
  {

  }

  @Post('userUpload/:id')
  @UseInterceptors(
    FileInterceptor('file')
  )
  async updateUserSheet(
    @Param('id') id: number,
    @UploadedFile() uploadedFile: Express.Multer.File,
  )
  {


    const phoneNumbers = await this.phonebookService.extractPhoneNumbersFromCsv(uploadedFile.buffer);

    const [totalCount, totalDuplicates, uniqueNumbers] = await this.phonebookService.getUniquePhoneNumbersForUser(phoneNumbers);
    return { totalCount, totalDuplicates, uniqueNumbers };
  }
}
