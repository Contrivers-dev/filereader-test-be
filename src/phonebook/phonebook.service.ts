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
    console.log("Incoming unique phone numbers:", uniquePhoneNumbers);

    
    const existingPhoneNumbers = await this.phonebookRepository
      .createQueryBuilder("phonebook")
      .select("phonebook.phoneNumber")
      .getMany();
      

    const existingPhoneNumberSet = new Set(
      existingPhoneNumbers.map((entry) => entry.phoneNumber)
    );


    console.log("Exisiting phone numbers in db");
    console.log(existingPhoneNumberSet);
    
    const filteredUniquePhoneNumbers = uniquePhoneNumbers.filter(
      (phone) => !existingPhoneNumberSet.has(phone)
    );

     console.log("Unique numbers that are going to be entered");
     console.log(filteredUniquePhoneNumbers);

   
      const phonebookEntries = filteredUniquePhoneNumbers.map((number) => {
      const entry = new Phonebook();
      entry.phoneNumber = number;
      entry.createdBy = { id: userId } as User;
      return entry;
    });

    try {
      const batchSize = 10000; 
      for (let i = 0; i < phonebookEntries.length; i += batchSize) {
        const batch = phonebookEntries.slice(i, i + batchSize);
        console.log(`Saving batch ${i / batchSize + 1} with ${batch.length} entries...`);
        await this.phonebookRepository.save(batch);
        console.log(`Batch ${i / batchSize + 1} saved successfully.`);
      }
    } catch (error) {
      console.error("Error saving phonebook entries:", error);
      throw error; // Rethrow the error or handle it as needed
    }

    return {
      total: uniquePhoneNumbers.length,
      duplicates: uniquePhoneNumbers.length - filteredUniquePhoneNumbers.length,
      unique: filteredUniquePhoneNumbers.length,
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
