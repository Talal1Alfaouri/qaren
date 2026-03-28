import {
  Controller, Get, Post, Body, Param, Query, Req, Res, HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProductsService, SearchParams } from './products.service';
import { createHash } from 'crypto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private products: ProductsService) {}

  @Get('search')
  @ApiOperation({ summary: 'Search products with filters' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'brand', required: false })
  @ApiQuery({ name: 'store', required: false })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'sort', required: false, enum: ['price_asc', 'price_desc', 'relevance', 'popular'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async search(@Query() query: SearchParams) {
    return this.products.search({
      ...query,
      page: query.page ? parseInt(String(query.page)) : 1,
      limit: Math.min(query.limit ? parseInt(String(query.limit)) : 24, 100),
      minPrice: query.minPrice ? parseFloat(String(query.minPrice)) : undefined,
      maxPrice: query.maxPrice ? parseFloat(String(query.maxPrice)) : undefined,
    });
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get all product categories' })
  async getCategories() {
    return this.products.getCategories();
  }

  @Get('deals')
  @ApiOperation({ summary: 'Get featured deals with biggest discounts' })
  async getDeals(@Query('limit') limit?: string) {
    return this.products.getFeaturedDeals(limit ? parseInt(limit) : 12);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get product details with all store offers' })
  async getProduct(@Param('slug') slug: string) {
    return this.products.getBySlug(slug);
  }

  @Get(':id/price-history')
  @ApiOperation({ summary: 'Get price history for a product' })
  async getPriceHistory(
    @Param('id') id: string,
    @Query('days') days?: string,
  ) {
    return this.products.getPriceHistory(id, days ? parseInt(days) : 30);
  }

  @Post('offers/:offerId/click')
  @HttpCode(200)
  @ApiOperation({ summary: 'Track affiliate click and return redirect URL' })
  async trackClick(
    @Param('offerId') offerId: string,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '';
    const ipHash = createHash('sha256').update(ip).digest('hex');

    await this.products.trackClick(offerId, {
      sessionId: req.headers['x-session-id'] as string,
      ipHash,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'],
    });

    return { ok: true };
  }
}
