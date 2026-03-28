import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('admin/analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  async getDashboard() {
    return this.analytics.getDashboardStats();
  }

  @Get('clicks/timeline')
  @ApiOperation({ summary: 'Get click timeline by store' })
  async getClickTimeline(@Query('days') days?: string) {
    return this.analytics.getClickTimeline(days ? parseInt(days) : 30);
  }
}
