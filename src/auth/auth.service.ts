import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MailService } from 'src/mail/mail.service';
import { Uploads } from 'src/uploads/uploads.entity';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class AuthService
{
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Uploads)
    private readonly phonebookRepository: Repository<Uploads>,
    private mailService: MailService,
    private jwtService: JwtService,
  ) { }


  async generateToken(user: User)
  {
    const payload = {
      username: user.name,
      email: user.email,
      id: user.id,
      role: user.role,
      uploadLimit: user.uploadLimit,
      availableLimit: user.availableLimit
    };

    return await this.jwtService.sign(payload, { secret: `${process.env.JWT_SECRET}` });

  }


  async login(email: string, password: string): Promise<any>
  {
    const user = await this.validateUser(email, password);
    if (user)
    {

      const newUser = await this.loginUser(user);
      return newUser;
    } else
    {
      throw new UnauthorizedException('Email/password incorrect');
    }
  }


  async validateUser(email: string, pass: string)
  {
    try
    {
      const user1 = await this.userRepository.findOne({
        where: { email: email }
      });

      if (!user1)
      {
        throw new UnauthorizedException('Email/password incorrect');
      }

      const isMatch = await this.comparePassword(
        user1.password,
        pass,
      );
      if (!isMatch)
      {
        throw new UnauthorizedException('Email/password incorrect');
      } else
      {
        const { password, ...user } = user1;
        return user;
      }
    } catch (ex)
    {
      throw ex;
    }
  }


  async comparePassword(savedhash: string, password: string): Promise<any>
  {

    try
    {
      const result = await bcrypt.compare(password, savedhash);
      console.log("password matched", result);

      return result;
    } catch (ex)
    {
      throw ex;
    }
  }

  async loginUser(user: any)
  {
    const access_token = await this.generateToken(user);
    return {
      access_token,
      user,
    };
  }

  async sendPasswordResetEmail(email: string, subject: string)
  {
    const user = await this.userRepository.findOne({
      where: { email: email }
    });
    const jwtToken = await this.generateToken(user);
    await this.mailService.sendPasswordResetEmail(user, jwtToken, subject);
    return "Password Reset Sucessfully";
  }


  async changePassword(id: number, password: string)
  {
    const user = await this.userRepository.findOne({
      where: { id: id }
    });
    user.password = await bcrypt.hash(password, 10);
    await this.userRepository.save(user);
    return "Password Changed Sucessfully";
  }

  generatePassword(length: number = 12): string
  {
    const buffer = randomBytes(Math.ceil(length / 2));
    return buffer.toString('hex').slice(0, length);
  }

  async createAdminUser(): Promise<any>
  {
    try
    {
      const existingAdmin = await this.userRepository.findOne({
        where: { email: 'admin@admin.com' },
      });
      if (existingAdmin)
      {
        return { error: true, message: 'Admin user already created' };
      }

      const adminUser = this.userRepository.create({
        name: 'admin',
        email: 'admin@admin.com',
        password: await bcrypt.hash('1234', 10),
        role: 'admin',
      });

      await this.userRepository.save(adminUser);
      return { error: false, message: 'Admin user successfully created.' };
    } catch (e)
    {
      console.log(e);
      return { error: true, message: 'Admin user not created.' };
    }
  }

  async createUser(email: string, name: string, role: string, uploadLimit: number)
  {
    try
    {
      if (!email || !name)
      {
        return {
          error: true,
          message: 'All fields are required',
        };
      }
      if (role === 'admin')
      {
        const userExists = await this.userRepository.findOne({
          where: { email },
        });
        if (userExists)
        {
          return { error: true, message: 'User already exists' };
        }
        const user = this.userRepository.create({
          name,
          email,
          password: null,
          role: 'user',
          uploadLimit,
          availableLimit: uploadLimit
        });

        const subject = "Set your new password";
        await this.userRepository.save(user);
        await this.sendPasswordResetEmail(email, subject);
        return { error: false, message: 'User created' };
      } else
      {
        return {
          error: true,
          message: 'You are not allowed to perform this action.',
        };
      }
    } catch (error)
    {
      return { error: true, message: error?.message };
    }
  }

  async updateUser(userId: number, uploadLimit: number)
  {
    try
    {
      if (!userId || !uploadLimit)
      {
        return {
          error: true,
          message: 'All fields are required',
        };
      }
      const user = await this.userRepository.findOne({
        where: { id: userId },
      });
      if (!user)
      {
        return { error: true, message: 'User does not exists' };
      }

      if (uploadLimit > user.uploadLimit)
      {
        user.availableLimit = user.availableLimit + (uploadLimit - user.uploadLimit);
      }

      if (uploadLimit < user.uploadLimit)
      {
        const temp = user.uploadLimit - uploadLimit;
        if (user.availableLimit > temp)
        {
          user.availableLimit = user.availableLimit - temp;
        }
      }

      user.uploadLimit = uploadLimit;
      await this.userRepository.save(user);
      return { error: false, message: 'User Updated' };

    } catch (error)
    {
      return { error: true, message: error?.message };
    }
  }

  async GetAllSheets(role: string, id: number)
  {
    try
    {
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user)
      {
        return {
          error: true,
          message: 'User with this id not found.',
        };
      }
      const sheets = await this.phonebookRepository.find({
        relations: ['createdBy'],
        where: {
          createdBy: { id },
        },
      });
      return { error: false, sheets, message: 'sheets fetched.' };
    } catch (error)
    {
      return { error: true, message: error?.message };
    }
  }

  async GetAllUsers(role: string)
  {
    try
    {
      const users = await this.userRepository.find();
      return { error: false, users, message: 'users fetched.' };
    } catch (error)
    {
      return { error: true, message: error?.message };
    }
  }

  async downloadCsv(name: string, res)
  {
    return "true";
  }

  async deleteUser(id: number): Promise<void>
  {

  }
}
