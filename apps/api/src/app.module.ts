import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PatientsModule } from './patients/patients.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from "./admin/admin.module";
import { TherapistModule } from "./therapist/therapist.module";
import { ParentModule } from "./parent/parent.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AreasModule } from "./areas/areas.module";
import { FollowUpsModule } from "./followups/followups.module";
import { ObjectiveBankModule } from "./objective-bank/objective-bank.module";
import { MetaWhatsappModule } from "./meta-whatsapp/meta-whatsapp.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [".env", ".env.local"] }),
    AuthModule,
    PrismaModule,
    PatientsModule,
    UsersModule,
    AdminModule,
    TherapistModule,
    ParentModule,
    AreasModule,
    FollowUpsModule,
    ObjectiveBankModule,
    MetaWhatsappModule,
  ],
  controllers: [AppController,],
  providers : [AppService],
})

export class AppModule {}
