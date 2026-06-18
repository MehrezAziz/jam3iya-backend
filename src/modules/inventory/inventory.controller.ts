import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import {
  adjustLotSchema,
  setItemStockSchema,
  createItemSchema,
  createLotSchema,
  listItemsQuerySchema,
  updateItemSchema,
  updateLotSchema,
  type AdjustLotDto,
  type SetItemStockDto,
  type CreateItemDto,
  type CreateLotDto,
  type ListItemsQuery,
  type UpdateItemDto,
  type UpdateLotDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthorizationGuard } from '../../common/guards/authorization.guard';
import { RequirePerm } from '../../common/decorators/require-perm.decorator';
import { CurrentOrg, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditAction } from '../../common/decorators/audit.decorator';
import { AuditInterceptor } from '../../common/interceptors/audit.interceptor';
import type { AuthenticatedUser } from '../../common/types/request-context';

@Controller('inventory')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@UseInterceptors(AuditInterceptor)
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  // ---------- Items ----------
  @Get('items')
  @RequirePerm('inventory.read')
  listItems(
    @CurrentOrg() orgId: string,
    @Query(new ZodValidationPipe(listItemsQuerySchema)) query: ListItemsQuery,
  ) {
    return this.service.listItems(orgId, query);
  }

  @Get('items/:id')
  @RequirePerm('inventory.read')
  getItem(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.getItem(orgId, id);
  }

  @Post('items')
  @RequirePerm('inventory.item.manage')
  @AuditAction({ action: 'inventory.item.create', resourceType: 'inventory_item', captureDiff: true })
  createItem(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createItemSchema)) dto: CreateItemDto,
  ) {
    return this.service.createItem(orgId, user.userId, dto);
  }

  @Patch('items/:id')
  @RequirePerm('inventory.item.manage')
  @AuditAction({ action: 'inventory.item.update', resourceType: 'inventory_item', captureDiff: true })
  updateItem(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateItemSchema)) dto: UpdateItemDto,
  ) {
    return this.service.updateItem(orgId, id, dto);
  }

  @Patch('items/:id/stock')
  @RequirePerm('inventory.adjust')
  @AuditAction({ action: 'inventory.item.set_stock', resourceType: 'inventory_item', resourceIdParam: 'id' })
  setItemStock(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(setItemStockSchema)) dto: SetItemStockDto,
  ) {
    return this.service.setItemStock(orgId, user.userId, id, dto.quantity, dto.reason);
  }

  @Delete('items/:id')
  @RequirePerm('inventory.item.manage')
  @AuditAction({ action: 'inventory.item.delete', resourceType: 'inventory_item' })
  deleteItem(@CurrentOrg() orgId: string, @Param('id') id: string) {
    return this.service.deleteItem(orgId, id);
  }

  // ---------- Lots ----------
  @Post('lots')
  @RequirePerm('inventory.lot.manage')
  @AuditAction({ action: 'inventory.lot.create', resourceType: 'stock_lot', captureDiff: true })
  createLot(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createLotSchema)) dto: CreateLotDto,
  ) {
    return this.service.createLot(orgId, user.userId, dto);
  }

  @Patch('lots/:id')
  @RequirePerm('inventory.lot.manage')
  @AuditAction({ action: 'inventory.lot.update', resourceType: 'stock_lot', captureDiff: true, resourceIdParam: 'id' })
  updateLot(
    @CurrentOrg() orgId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateLotSchema)) dto: UpdateLotDto,
  ) {
    return this.service.updateLot(orgId, id, dto);
  }

  @Post('lots/:id/adjust')
  @RequirePerm('inventory.adjust')
  @AuditAction({ action: 'inventory.lot.adjust', resourceType: 'stock_lot', captureDiff: true })
  adjustLot(
    @CurrentOrg() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(adjustLotSchema)) dto: AdjustLotDto,
  ) {
    return this.service.adjustLot(orgId, user.userId, id, dto);
  }
}
