import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './common/prisma.service';
import { AuditService } from './modules/audit/audit.service';
import { AuthGuard } from './modules/auth/auth.guard';
import { PermissionGuard } from './modules/permissions/permission.guard';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { UsersController } from './modules/users/users.controller';
import { PermissionController } from './modules/permissions/permission.controller';
import { RolesController } from './modules/roles/roles.controller';
import { MenusController } from './modules/menus/menus.controller';
import { DepartmentsController } from './modules/departments/departments.controller';
import { TicketsController } from './modules/tickets/tickets.controller';
import { TicketsService } from './modules/tickets/tickets.service';
import { WorkflowService } from './modules/workflow/workflow.service';
import { AuditController } from './modules/audit/audit.controller';
import { ConfigController } from './modules/config/config.controller';
import { NotificationsController } from './modules/notifications/notifications.controller';
import { FilesController } from './modules/files/files.controller';
import { ReportsController } from './modules/reports/reports.controller';
import { SystemMonitorController } from './modules/system/system-monitor.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'dev-secret-change-me',
      signOptions: { expiresIn: '2h' },
    }),
  ],
  controllers: [
    AuthController,
    UsersController,
    PermissionController,
    RolesController,
    MenusController,
    DepartmentsController,
    ConfigController,
    NotificationsController,
    FilesController,
    ReportsController,
    SystemMonitorController,
    TicketsController,
    AuditController,
  ],
  providers: [
    PrismaService,
    AuditService,
    AuthService,
    TicketsService,
    WorkflowService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: PermissionGuard },
  ],
})
export class AppModule {}
