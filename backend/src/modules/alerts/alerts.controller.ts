import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AlertsService, CreateAlertDto } from './alerts.service';
import { IsEmail, IsNumber, IsString, IsOptional, Min } from 'class-validator';

class CreateAlertBody {
  @IsString() productId: string;
  @IsNumber() @Min(1) targetPrice: number;
  @IsEmail() email: string;
  @IsString() @IsOptional() storeSlug?: string;
}

@ApiTags('Price Alerts')
@Controller('alerts')
export class AlertsController {
  constructor(private alerts: AlertsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a price alert for a product' })
  async create(@Body() dto: CreateAlertBody) {
    return this.alerts.createAlert(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all alerts for an email address' })
  async getAlerts(@Query('email') email: string) {
    if (!email) return [];
    return this.alerts.getAlertsForEmail(email);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete/deactivate an alert' })
  async deleteAlert(@Param('id') id: string, @Query('email') email: string) {
    await this.alerts.deleteAlert(id, email);
  }
}
