
## Description

This repository is FileReader Test Project for candidates

## Installation

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Tasks

1) Admin & User should be able to Upload both CSV & Xlsx files
2) Admin can create new users which should send email on that address allowing users to set a password for the account & login instantly
3) Users should be able to reset their passwords
4) Uploaded Files can have any kind of column name e.g phonenumber, telephone, phone, cell phone etc for the numbers & codebase should be able to detect it
5) When an Admin uploads a file, only unique & new phone-numbers should be added to DB
6) Once uploaded, Admin should see total count, total duplicates & Unique phone-numbers found in the uploaded file
7) User should be able to uplaod a file & see total count, total duplicates found in the uploaded file & Unique phone-numbers. Dont save these phonenumbers in DB. Only Admin adds numbers to DB
8) User should be able to download the orignal file, Cleaned File(After removing duplicates), Duplicate File(All duplicate numbers)
9) Use Mysql Database for this project

