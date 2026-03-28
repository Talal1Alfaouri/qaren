import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class ExtraScraper {
  async search(query: string): Promise<any[]> {
    try {
      const response = await axios.get('https://www.extra.com/en-sa/search', {
        params: { text: query },
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000,
      });
      return [];
    } catch {
      return [];
    }
  }
}
