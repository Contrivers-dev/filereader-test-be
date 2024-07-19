import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { JwtService } from "@nestjs/jwt";
import * as dotenv from "dotenv";
dotenv.config();
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}
  use(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Token found ", token);
    if (token) {
      const decode = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });
      req["user"] = decode;
      console.log(req["user"]);
      console.log("Passsing middleware");
      next();
    } else {
      console.log("Error in middleware");
      throw new HttpException("Unauthorizeed", HttpStatus.UNAUTHORIZED);
    }

    // next();
  }
}
