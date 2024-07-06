import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository, getConnection } from 'typeorm';
import { Phonebook } from './phonebook.entity';
import { User } from 'src/auth/user.entity';
import { Uploads } from 'src/uploads/uploads.entity';

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
  ) { }

  async savePhoneNumber(phoneNumber: string, createdByUserId: number): Promise<Phonebook> {
    const phonebookEntry = new Phonebook();
    const user = await this.userRepository.findOneBy({ id: createdByUserId });
    phonebookEntry.phoneNumber = phoneNumber;
    phonebookEntry.createdBy = user;

    return await this.phonebookRepository.save(phonebookEntry);
  }

  async savePhoneNumbers(phoneNumbers: string[], createdByUserId: number): Promise<void> {
    for (const phoneNumber of phoneNumbers) {
      await this.savePhoneNumber(phoneNumber, createdByUserId);
    }
  }


}

