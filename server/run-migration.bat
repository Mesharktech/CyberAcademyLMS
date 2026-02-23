@echo off
call npx prisma migrate dev --name init > migration.log 2>&1
