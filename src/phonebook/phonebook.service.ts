import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/auth/user.entity';
import { Uploads } from 'src/uploads/uploads.entity';
import { Readable } from 'stream';
import { Connection, Repository } from 'typeorm';
import { Phonebook } from './phonebook.entity';
import csv = require('csv-parser');
@Injectable()
export class PhonebookService
{

  constructor(
    private readonly connection: Connection,
    @InjectRepository(Phonebook)
    private readonly phonebookRepository: Repository<Phonebook>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Uploads)
    private readonly uploadsRepository: Repository<Uploads>,
  ) { }


  async adminUpload(phoneNumbers: string[]): Promise<[number, number, string[]]>
  {
    let uniqueNumbers: string[] = [];
    let totalDuplicates = 0;

    for (const phoneNumber of phoneNumbers)
    {
      const existingPhoneNumber = await this.phonebookRepository.find(
        { where: { phoneNumber: phoneNumber } }
      );

      if (existingPhoneNumber.length != 0)
      {
        totalDuplicates++;
      } else
      {
        uniqueNumbers.push(phoneNumber);
        await this.phonebookRepository.save({ phoneNumber });
      }
    }

    const totalCount = uniqueNumbers.length + totalDuplicates;
    return [totalCount, totalDuplicates, uniqueNumbers];
  }

  async getUniquePhoneNumbersForUser(phoneNumbers: string[]): Promise<[number, number, string[]]>
  {
    let uniqueNumbers: string[] = [];
    let totalDuplicates = 0;

    for (const phoneNumber of phoneNumbers)
    {
      const existingPhoneNumber = await this.phonebookRepository.find(
        { where: { phoneNumber: phoneNumber } }
      );

      if (existingPhoneNumber.length != 0)
      {
        totalDuplicates++;
      } else
      {
        uniqueNumbers.push(phoneNumber);
      }
    }

    const totalCount = uniqueNumbers.length + totalDuplicates;
    return [totalCount, totalDuplicates, uniqueNumbers];
  }

  async extractPhoneNumbersFromCsv(buffer: Buffer): Promise<string[]>
  {
    return new Promise<string[]>((resolve, reject) =>
    {
      const phoneNumbers: string[] = [];
      const stream = Readable.from(buffer.toString());
      stream
        .pipe(csv())
        .on('data', (data) =>
        {
          const phoneNumber = data['Telephone'];
          if (phoneNumber && phoneNumber.match(/^\d+$/))
          {
            phoneNumbers.push(phoneNumber.trim());
          }
        })
        .on('end', () =>
        {
          resolve(phoneNumbers);
        })
        .on('error', (error) =>
        {
          reject(error);
        });
    });
  }
}