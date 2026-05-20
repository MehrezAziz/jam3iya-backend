import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { z } from 'zod';
import type { Response } from 'express';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditAction } from '../../common/decorators/audit.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/request-context';

const attachDocumentSchema = z.object({
  ownerType: z.enum([
    'beneficiary',
    'spouse',
    'child',
    'job',
    'housing',
    'disease',
    'serious_illness',
    'social_coverage',
  ]),
  ownerId: z.string().uuid(),
  category: z.enum([
    'cin',
    'medical',
    'school',
    'housing_proof',
    'salary_proof',
    'birth_certificate',
    'marriage_certificate',
    'divorce_certificate',
    'death_certificate',
    'unemployment_proof',
    'bank_statement',
    'utility_bill',
    'signed_consent',
    'other',
  ]),
  fileId: z.string().uuid(),
  issuedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const updateDocumentSchema = z.object({
  fileId: z.string().uuid(),
});

@Controller('files')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class FilesController {
  constructor(private readonly service: FilesService) {}

  @Post('upload')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'file.upload', resourceType: 'stored_file' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ) {
    return this.service.upload(orgId, user.userId, file);
  }

  @Post('documents')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'document.attach', resourceType: 'document', captureDiff: true })
  attach(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(attachDocumentSchema)) dto: z.infer<typeof attachDocumentSchema>,
  ) {
    return this.service.attachDocument(orgId, dto);
  }

  @Patch('documents/:id')
  @RequirePerm('beneficiary.update')
  @AuditAction({
    action: 'document.update',
    resourceType: 'document',
    resourceIdParam: 'id',
    captureDiff: true,
  })
  update(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDocumentSchema)) dto: z.infer<typeof updateDocumentSchema>,
  ) {
    return this.service.updateDocument(orgId, id, dto);
  }

  @Get('documents')
  @RequirePerm({ permissions: 'beneficiary.read.summary', requiresReason: false })
  list(
    @CurrentOrg() orgId: string,
    @Query('ownerType') ownerType: string,
    @Query('ownerId') ownerId: string,
  ) {
    if (!ownerType || !ownerId) {
      return [];
    }
    return this.service.listDocuments(orgId, ownerType as never, ownerId);
  }

  @Get('documents/by-beneficiary/:beneficiaryId')
  @RequirePerm({ permissions: 'beneficiary.read.summary', requiresReason: false })
  listByBeneficiary(@CurrentOrg() orgId: string, @Param('beneficiaryId') beneficiaryId: string) {
    return this.service.listBeneficiaryTreeDocuments(orgId, beneficiaryId);
  }

  @Get(':fileId/download')
  @RequirePerm({ permissions: 'beneficiary.read.summary', requiresReason: false })
  async download(
    @CurrentOrg() orgId: string,
    @Param('fileId') fileId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const streamable = await this.service.downloadFile(orgId, fileId);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return streamable;
  }

  @Delete('documents/:id')
  @RequirePerm('beneficiary.update')
  @AuditAction({ action: 'document.delete', resourceType: 'document', resourceIdParam: 'id' })
  remove(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.deleteDocument(orgId, id);
  }
}
