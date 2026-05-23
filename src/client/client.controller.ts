import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = join(__dirname, '..', '..', 'public');

@Controller()
export class ClientController {
  @Get('client')
  @Get('client.html')
  getClient(@Res() res: Response) {
    const html = readFileSync(join(PUBLIC_DIR, 'client.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('qrcodes')
  @Get('qrcodes.html')
  getQrCodes(@Res() res: Response) {
    const html = readFileSync(join(PUBLIC_DIR, 'qrcodes.html'), 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Get('qr-table-:id.png')
  getQrImage(@Param('id') id: string, @Res() res: Response) {
    const filePath = join(PUBLIC_DIR, `qr-table-${id}.png`);
    if (!existsSync(filePath)) throw new NotFoundException('QR code non trouvé');
    res.setHeader('Content-Type', 'image/png');
    res.sendFile(filePath);
  }
}
