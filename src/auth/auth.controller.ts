import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return this.authService.getProfile(req.user.id);
  }

  @Post('forgot-password')
  forgotPassword(@Body() data: { telephone: string; newPassword: string }) {
    return this.authService.forgotPassword(data.telephone, data.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('password')
  changePassword(@Request() req, @Body() data: { oldPassword: string; newPassword: string }) {
    return this.authService.changePassword(req.user.id, data.oldPassword, data.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(@Request() req, @Body() data: { nom?: string; photo?: string }) {
    return this.authService.updateProfile(req.user.id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('photo')
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads/profiles',
      filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      },
    }),
  }))
  uploadPhoto(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const photoUrl = '/uploads/profiles/' + file.filename;
    return this.authService.updateProfile(req.user.id, { photo: photoUrl });
  }
}
