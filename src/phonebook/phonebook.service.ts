import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Connection, Repository, getConnection } from "typeorm";
import { Phonebook } from "./phonebook.entity";
import { User } from "src/auth/user.entity";
import { Uploads } from "src/uploads/uploads.entity";

@Injectable()
export class PhonebookService {
  constructor(
    private readonly connection: Connection,
    @InjectRepository(Phonebook)
    private readonly phonebookRepository: Repository<Phonebook>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Uploads)
    private readonly uploadsRepository: Repository<Uploads>
  ) {}

  async importUniquePhoneNumbers(uniquePhoneNumbers: string[], userId: number) {
    console.log(uniquePhoneNumbers);
    const existingPhoneNumbers = await this.phonebookRepository
      .createQueryBuilder("phonebook")
      .select("phonebook.phoneNumber")
      .getMany();
    console.log("Here optimizing it a little bit to improve the performance");
    const existingPhoneNumberSet = new Set(
      existingPhoneNumbers.map((entry) => entry.phoneNumber)
    );
    console.log("Out of loop");
    const newPhoneNumbers = uniquePhoneNumbers.filter(
      (phone) => !existingPhoneNumberSet.has(phone)
    );
    console.log("new phone numnbers");
    // const phonebookEntries = newPhoneNumbers.map((number) => {
    //   const entry = new Phonebook();
    //   entry.phoneNumber = number;
    //   entry.createdBy = { id: userId } as User;
    //   return entry;
    // });
    console.log("Declaring new loop");
    const phonebookEntries: Phonebook[] = [];
    console.log("Now creating new foreach loop");
    newPhoneNumbers.forEach((number) => {
      const entry = new Phonebook();
      entry.phoneNumber = number;
      entry.createdBy = { id: userId } as User;
      phonebookEntries.push(entry);
    });
    console.log("Now creating new foreach loop");
    if (phonebookEntries.length > 0) {
      console.log("saving data");
      // await this.phonebookRepository.save(phonebookEntries);
      const batchSize = 1000; // Define a reasonable batch size

      for (let i = 0; i < phonebookEntries.length; i += batchSize) {
        const batch = phonebookEntries.slice(i, i + batchSize);
        await this.phonebookRepository.save(batch);
      }

      console.log("saved successfully");
    }

    return {
      total: uniquePhoneNumbers.length,
      duplicates: uniquePhoneNumbers.length - newPhoneNumbers.length,
      unique: newPhoneNumbers.length,
    };
  }
  async saveUploadDetails(details: {
    fileName: string;
    cleanFileName: string;
    flaggedFileName: string;
    totalCount: number;
    cleaned: number;
    duplicate: number;
    createdBy: number;
  }): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: details.createdBy },
    });
    if (!user) {
      throw new Error(`User with ID ${details.createdBy} not found`);
    }

    const upload = new Uploads();
    upload.fileName = details.fileName;
    upload.cleanFileName = details.cleanFileName;
    upload.flaggedFileName = details.flaggedFileName;
    upload.totalCount = details.totalCount;
    upload.cleaned = details.cleaned;
    upload.duplicate = details.duplicate;
    upload.createdBy = user;

    await this.uploadsRepository.save(upload);
  }
}
