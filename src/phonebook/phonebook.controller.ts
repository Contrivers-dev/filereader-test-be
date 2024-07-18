import {
  Controller,
  Post,
  Param,
  UploadedFile,
  UseInterceptors,
  Req,
  Res,
  UseGuards,
  Get,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Multer } from "multer";
import { PhonebookService } from "./phonebook.service";
import { diskStorage } from "multer";
import * as fs from "fs";
import * as xlsx from "xlsx";
import { Request, Response } from "express";
import { RolesGuard } from "src/Guards/roles.guard";
import { Roles } from "src/Guards/roles.decorator";
const csvWriter = require("csv-writer").createObjectCsvWriter;
const csvParser: any = require("csv-parser");

const csvmimetype = ["text/csv", "application/csv", "text/plain"];
const xlsxMimeTypes = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/xlsx",
];

@Controller("sheets")
@UseGuards(RolesGuard)
export class PhonebookController {
  constructor(private readonly phonebookService: PhonebookService) {}

  uploadCsv(filePath: string): Promise<{ [key: string]: string[] }> {
    return new Promise((resolve, reject) => {
      const headerValueMap: { [key: string]: string[] } = {};

      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (data: any) => {
          const headers = Object.keys(data);
          headers.forEach((h) => {
            if (!headerValueMap[h]) {
              headerValueMap[h] = [];
            }
            headerValueMap[h].push(data[h]);
          });
        })
        .on("end", () => {
          console.log("CSV file successfully processed");
          resolve(headerValueMap);
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  uploadExcel(filePath: string): Promise<{ [key: string]: string[] }> {
    return new Promise((resolve, reject) => {
      try {
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(sheet);

        const headerValuesMap: { [key: string]: string[] } = {};

        jsonData.forEach((data, index) => {
          const headers = Object.keys(data);
          headers.forEach((h) => {
            if (!headerValuesMap[h]) {
              headerValuesMap[h] = [];
            }
            headerValuesMap[h].push(data[h]);
          });
        });
        console.log(headerValuesMap);
        resolve(headerValuesMap);
      } catch (error) {
        reject(error);
      }
    });
  }
  @Roles("admin")
  @Post("adminUpload/")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const newFilename = `${Date.now()}_${Math.random()}_${file.originalname}`;
          cb(null, newFilename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (
          csvmimetype.includes(file.mimetype) ||
          xlsxMimeTypes.includes(file.mimetype)
        ) {
          cb(null, true);
        } else {
          cb(
            new HttpException(
              "File not supported please choose some other file ",
              HttpStatus.NOT_ACCEPTABLE
            ),
            false
          );
        }
      },
    })
  )
  async adminUpload(
    @UploadedFile() file: Multer.File,
    @Req() request: Request
  ): Promise<any> {
    return this.handleUpload(file, request, true);
  }
  @Roles("user")
  @Post("userUpload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: diskStorage({
        destination: "./uploads",
        filename: (req, file, cb) => {
          const newFilename = `${Date.now()}_${Math.random()}_${file.originalname}`;
          cb(null, newFilename);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (
          csvmimetype.includes(file.mimetype) ||
          xlsxMimeTypes.includes(file.mimetype)
        ) {
          cb(null, true);
        } else {
          cb(
            new HttpException(
              "File not supported please choose some other file ",
              HttpStatus.NOT_ACCEPTABLE
            ),
            false
          );
        }
      },
    })
  )
  async userUpload(
    @UploadedFile() file: Multer.File,
    @Req() request: Request
  ): Promise<any> {
    return this.handleUpload(file, request, false);
  }

  async handleUpload(
    file: Multer.File,
    request: Request,
    isAdmin: boolean
  ): Promise<any> {
    const userId = request["user"].userId;

    try {
      let phoneNumbers: string[] = [];

      if (csvmimetype.includes(file.mimetype)) {
        phoneNumbers = await this.uploadCsvStream(file.path);
      } else if (xlsxMimeTypes.includes(file.mimetype)) {
        phoneNumbers = await this.uploadExcelStream(file.path);
      } else {
        console.log("Wrong file ");
        return {
          statusCode: HttpStatus.NOT_ACCEPTABLE,
          message: "File not supported, please choose another file.",
        };
      }
      console.log("Total Phone Numbers: ", phoneNumbers.length);

      const uniquePhoneNumbers = Array.from(new Set(phoneNumbers));
      console.log("Unique Phone Numbers: ", uniquePhoneNumbers.length);

      const duplicatePhoneNumbersSet = new Set();
      const duplicates = phoneNumbers.filter((num) => {
        if (duplicatePhoneNumbersSet.has(num)) {
          return true; // Duplicate found
        } else {
          duplicatePhoneNumbersSet.add(num);
          return false;
        }
      });
      console.log("Duplicate Phone Numbers: ", duplicates.length);

      const cleanedFileName = `${Date.now()}_cleaned_${file.originalname}`;
      const duplicateFileName = `${Date.now()}_duplicates_${file.originalname}`;
      const cleanedFilePath = `./uploads/${cleanedFileName}`;
      const duplicateFilePath = `./uploads/${duplicateFileName}`;
      console.log("File paths: ", { cleanedFilePath, duplicateFilePath });

      await this.saveToFile(cleanedFilePath, uniquePhoneNumbers);
      await this.saveToFile(duplicateFilePath, duplicates);
      console.log("Files saved");

      await this.phonebookService.saveUploadDetails({
        fileName: file.filename,
        cleanFileName: cleanedFileName,
        flaggedFileName: duplicateFileName,
        totalCount: phoneNumbers.length,
        cleaned: uniquePhoneNumbers.length,
        duplicate: duplicates.length,
        createdBy: userId,
      });
      console.log("File details saved to DB");

      if (isAdmin) {
        await this.phonebookService.importUniquePhoneNumbers(
          uniquePhoneNumbers,
          userId
        );
      }
      console.log("Admin import completed");

      return {
        total: phoneNumbers.length,
        duplicates: duplicates.length,
        unique: uniquePhoneNumbers.length,
        cleanedFileName: cleanedFileName,
        duplicateFileName: duplicateFileName,
        originalFileName: file.filename,
      };
    } catch (error) {
      console.error("Error processing the file: ", error);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "An error occurred while processing the file.",
      };
    }
  }

  uploadCsvStream(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const phoneNumbers: string[] = [];
      const headerValueMap: { [key: string]: string[] } = {};

      fs.createReadStream(filePath)
        .pipe(csvParser())
        .on("data", (data: any) => {
          Object.keys(data).forEach((h) => {
            if (
              /phone_number|telephone|Telephone|cell|mobile|contact/i.test(h)
            ) {
              phoneNumbers.push(data[h]);
            }
          });
        })
        .on("end", () => {
          console.log("CSV file successfully processed");
          resolve(phoneNumbers);
        })
        .on("error", (error) => {
          reject(error);
        });
    });
  }

  uploadExcelStream(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      try {
        const phoneNumbers: string[] = [];
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(sheet);

        jsonData.forEach((data) => {
          Object.keys(data).forEach((h) => {
            if (
              /phone_number|telephone|Telephone|cell|mobile|contact/i.test(h)
            ) {
              phoneNumbers.push(data[h]);
            }
          });
        });
        console.log("Excel file successfully processed");
        resolve(phoneNumbers);
      } catch (error) {
        reject(error);
      }
    });
  }

  async saveToFile(filePath: string, data: string[]): Promise<void> {
    const csvWriterInstance = csvWriter({
      path: filePath,
      header: [{ id: "phone_number", title: "Phone Number" }],
    });

    const records = data.map((item) => ({ phone_number: item }));

    await csvWriterInstance.writeRecords(records);
  }

  @Get("download/:fileName")
  async downloadFile(
    @Param("fileName") fileName: string,
    @Res() res: any
  ): Promise<void> {
    const filePath = `./uploads/${fileName}`;
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      throw new HttpException("File not found", HttpStatus.NOT_FOUND);
    }
  }
}
