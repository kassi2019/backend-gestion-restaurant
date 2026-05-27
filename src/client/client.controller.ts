import { Controller, Get, Param, Res, NotFoundException, Query } from '@nestjs/common';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';

const PUBLIC_DIR = join(__dirname, '..', '..', 'public');

@Controller()
export class ClientController {
  constructor(private prisma: PrismaService) {}

  @Get(['client', 'client.html'])
  getClient(@Res() res: Response) {
    const html = readFileSync(join(PUBLIC_DIR, 'client.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get(['qrcodes', 'qrcodes.html'])
  async getQrCodes(@Res() res: Response, @Query('restaurantId') restaurantId?: string) {
    const tables = await this.prisma.tableRestaurant.findMany({
      where: restaurantId ? { restaurantId: parseInt(restaurantId) } : {},
      select: { id: true, numero: true, zone: true, restaurantId: true },
      orderBy: { numero: 'asc' },
    });

    const cards = tables
      .map(
        (t) =>
          `<div class=card><h3>Table ${t.numero}</h3>` +
          `<img src=/qr-table-${t.id}.png width=200 alt="QR Table ${t.numero}">` +
          `<p>Zone: ${t.zone}</p></div>`,
      )
      .join('\n');

    const html =
      `<html><head><meta charset=UTF-8><title>QR Codes</title>` +
      `<style>body{font-family:sans-serif;display:flex;flex-wrap:wrap;gap:20px;padding:20px;justify-content:center}` +
      `h2{text-align:center;width:100%}.card{background:white;border-radius:12px;padding:16px;box-shadow:0 2px 8px rgba(0,0,0,.1);text-align:center}` +
      `.card h3{margin:0 0 8px 0}.card p{margin:0;font-size:12px;color:#999}</style></head>` +
      `<body><h2>QR Codes — Tables (${tables.length})</h2>${cards}</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('qr-table-:id.png')
  async getQrImage(@Param('id') id: string, @Res() res: Response) {
    const tableId = parseInt(id);
    if (isNaN(tableId)) throw new NotFoundException('ID table invalide');

    const table = await this.prisma.tableRestaurant.findUnique({
      where: { id: tableId },
      select: { id: true, numero: true, restaurantId: true },
    });
    if (!table) throw new NotFoundException('Table introuvable');

    const url = `/client.html?tableId=${table.id}&restaurantId=${table.restaurantId}`;
    const pngBuffer = await QRCode.toBuffer(url, { width: 300, margin: 2 });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(pngBuffer);
  }
}
