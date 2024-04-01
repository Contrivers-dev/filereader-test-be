import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository, getConnection } from "typeorm";
import { Phonebook } from "./phonebook.entity";
import { User } from "src/auth/user.entity";
import { Uploads } from "src/uploads/uploads.entity";
import * as fs from "fs";
import * as path from "path";
import * as multer from "multer";
// import * as csvParser from 'csv-parser';
import * as xlsx from "xlsx";
import csvParser from "csv-parser";
import * as streamifier from "streamifier";
import { phoneKeywords } from "src/utils/phoneKeywords";
@Injectable()
export class PhonebookService {
  constructor(
    private readonly connection: Connection,
    @InjectRepository(Phonebook)
    private readonly phonebookRepository: Repository<Phonebook>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Uploads)
    private readonly uploadsRepository: Repository<Uploads>,
  ) {}

  private async parseCsv(
    buffer: Buffer,
    uniquePhoneNumbers: Set<string>,
    duplicatePhoneNumbers: Set<string>,
  ): Promise<number> {
    const stream = streamifier.createReadStream(buffer); // Create a readable stream from the buffer
    let dataLength = 0;
    // Keywords related to phone numbers

    return new Promise<number>((resolve, reject) => {
      stream
        .pipe(csvParser())
        .on("data", (row: any) => {
          Object.keys(row).forEach((key: string) => {
            const value = row[key];
            const lowerCaseKey = key.toLowerCase();
            // check if key contain phone number and telphone or phone

            if (
              this.isPhoneNumber(value) &&
              phoneKeywords.some((keyword) => lowerCaseKey.includes(keyword))
            ) {
              dataLength++;
              if (uniquePhoneNumbers.has(value)) {
                duplicatePhoneNumbers.add(value);
              } else {
                uniquePhoneNumbers.add(value);
              }
            }
          });
        })

        .on("error", (error) => {
          reject(error);
        })
        .on("end", () => {
          resolve(dataLength);
        });
    });
  }

  private async parseXlsx(
    buffer: Buffer,
    uniquePhoneNumbers: Set<string>,
    duplicatePhoneNumbers: Set<string>,
  ): Promise<number> {
    const workbook = xlsx.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);
    let dataLength = 0;

    data.forEach((row: any) => {
      Object.keys(row).forEach((key: string) => {
        const value = row[key];
        const lowerCaseKey = key.toLowerCase();
        // check if key contain phone number and telphone or phone
        if (
          this.isPhoneNumber(value) &&
          phoneKeywords.some((keyword) => lowerCaseKey.includes(keyword))
        ) {
          dataLength++;
          if (uniquePhoneNumbers.has(value)) {
            duplicatePhoneNumbers.add(value);
          } else {
            uniquePhoneNumbers.add(value);
          }
        }
      });
    });
    return dataLength;
  }

  private isPhoneNumber(value: string): boolean {
    // You can implement a more sophisticated phone number validation here
    // For simplicity, let's assume any string containing numbers is a phone number
    return /\d/.test(value);
  }

  async uploadMultipleFiles(
    fileName: string,
    uniquePhoneNumbers: Set<string>,
    duplicatePhoneNumbers: Set<string>,
    file: Express.Multer.File,
    totalCount: number,
    user: User,
  ) {
    const folderPath = path.join(__dirname, "../../", "SampleFiles");

    await fs.promises.writeFile(path.join(folderPath, fileName), file.buffer);

    // Save unique phone numbers to a separate file
    await fs.promises.writeFile(
      path.join(folderPath, `Unique_${fileName}`),
      Array.from(uniquePhoneNumbers).join("\n"),
    );

    // Save duplicate phone numbers to a separate file
    await fs.promises.writeFile(
      path.join(folderPath, `Duplicate_${fileName}`),
      Array.from(duplicatePhoneNumbers).join("\n"),
    );

    const upload = new Uploads();
    upload.totalCount = totalCount;
    upload.duplicate = duplicatePhoneNumbers.size;
    upload.cleaned = uniquePhoneNumbers.size;
    upload.createdBy = user;
    upload.fileName = fileName;
    upload.fileName = fileName;
    upload.cleanFileName = `Unique_${fileName}`;
    upload.flaggedFileName = `Duplicate_${fileName}`;
    await this.uploadsRepository.save(upload);
    return {
      totalCount: totalCount,
      totalDuplicate: duplicatePhoneNumbers.size,
      totalUnique: uniquePhoneNumbers.size,
      fileName: `${fileName}`,
      uniqueFileName: `Unique_${fileName}`,
      duplicateFileName: `Duplicate_${fileName}`,
    };
  }

  async saveFile(
    file: Express.Multer.File,
    admin: string,
    id: number,
  ): Promise<any> {
    const allowedFileTypes = [".csv", ".xlsx"];
    const fileExt = path.extname(file.originalname);
    // checking if xlsx and csv format
    if (!allowedFileTypes.includes(fileExt.toLowerCase())) {
      throw new BadRequestException("Only CSV and XLSX files are allowed.");
    }

    const uniquePhoneNumbers: Set<string> = new Set();
    const duplicatePhoneNumbers: Set<string> = new Set();
    // Determine file type and parse accordingly
    let totalCount = 0;
    // Determine file type and parse accordingly
    if (file.mimetype === "text/csv") {
      totalCount = await this.parseCsv(
        file.buffer,
        uniquePhoneNumbers,
        duplicatePhoneNumbers,
      );
    } else if (
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      totalCount = await this.parseXlsx(
        file.buffer,
        uniquePhoneNumbers,
        duplicatePhoneNumbers,
      );
    } else {
      throw new Error("Unsupported file format");
    }
    // const totalCount = uniquePhoneNumbers.size + duplicatePhoneNumbers.size;
    const fileName = `${Date.now()}_${file.originalname}`;
    const user = await this.userRepository.findOne({ where: { id: id } });
    // code for admin for saving phone numbers   and also saving files in folder and also saving all file names in uploads table

    if (admin) {
      // Save unique phone numbers to the database
      const newPhoneNumbers: Phonebook[] = [];
      for (const phoneNumber of uniquePhoneNumbers) {
        const existingPhoneNumber = await this.phonebookRepository.findOne({
          where: { phoneNumber },
        });
        if (!existingPhoneNumber) {
          const newPhoneNumber = new Phonebook();
          newPhoneNumber.phoneNumber = phoneNumber;
          newPhoneNumber.createdBy = user;
          newPhoneNumbers.push(newPhoneNumber);
        }
      }
      await this.phonebookRepository.save(newPhoneNumbers);
      return this.uploadMultipleFiles(
        fileName,
        uniquePhoneNumbers,
        duplicatePhoneNumbers,
        file,
        totalCount,
        user,
      );
    }
    // code for user for just saving files in folder and also saving all file names in uploads table
    else {
      return this.uploadMultipleFiles(
        fileName,
        uniquePhoneNumbers,
        duplicatePhoneNumbers,
        file,
        totalCount,
        user,
      );
    }
  }
}
