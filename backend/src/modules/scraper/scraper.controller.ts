import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ScraperService } from './scraper.service';

@ApiTags('Scraper')
@Controller('admin/scraper')
export class ScraperController {
  constructor(private scraper: ScraperService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get scraper status and recent jobs' })
  async getStatus() {
    return this.scraper.getStatus();
  }

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger a full scrape' })
  async triggerScrape() {
    // Run async - don't await
    this.scraper.runFullScrape().catch(console.error);
    return { message: 'Scrape started', timestamp: new Date().toISOString() };
  }
}
