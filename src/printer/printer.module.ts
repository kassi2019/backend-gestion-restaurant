import { Module, forwardRef } from '@nestjs/common';
import { PrinterController } from './printer.controller';
import { PrinterService } from './printer.service';
import { PaiementModule } from '../paiement/paiement.module';

@Module({
  imports: [forwardRef(() => PaiementModule)],
  controllers: [PrinterController],
  providers: [PrinterService],
  exports: [PrinterService],
})
export class PrinterModule {}
