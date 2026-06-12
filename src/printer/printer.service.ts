import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// ─── ESC/POS Commandes ────────────────────────────────────────────
const ESC = '\x1b';
const GS = '\x1d';

const CMDS = {
  INIT: ESC + '@',
  CP1252: ESC + 't' + '\x10',       // Code page Windows-1252 (Latin-1) pour accents français
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  DOUBLE_HEIGHT_ON: GS + '!' + '\x11',
  DOUBLE_HEIGHT_OFF: GS + '!' + '\x00',
  DOUBLE_ON: GS + '!' + '\x33',
  DOUBLE_OFF: GS + '!' + '\x00',
  FEED_LINE: ESC + 'd' + '\x01',
  CUT_PARTIAL: GS + 'V' + '\x01',
  CUT_FULL: GS + 'V' + '\x00',
  DRAWER: ESC + 'p' + '\x00' + '\x19' + '\xfa',
};

export interface PrinterConfig {
  type: 'NETWORK' | 'WINDOWS' | 'NONE';
  ip: string;
  port: number;
  name: string;          // Nom de l'imprimante Windows (ex: "EPSON TM-T88V")
  shareName: string;     // Nom du partage (ex: "RECU") — pour copy \\localhost\RECU
  charWidth: number;
  autoPrint: boolean;
}

export type TicketDestination = 'CUISINE' | 'BAR' | 'SERVEUR' | 'CAISSE';

/** Remplace les caractères accentués par leur équivalent sans accent
 *  pour les imprimantes thermiques qui ne les supportent pas. */
export function normalizeText(texte: string): string {
  const MAP: Record<string, string> = {
    'À':'A','Á':'A','Â':'A','Ã':'A','Ä':'A','Å':'A',
    'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a',
    'Ç':'C','ç':'c',
    'È':'E','É':'E','Ê':'E','Ë':'E',
    'è':'e','é':'e','ê':'e','ë':'e',
    'Ì':'I','Í':'I','Î':'I','Ï':'I',
    'ì':'i','í':'i','î':'i','ï':'i',
    'Ò':'O','Ó':'O','Ô':'O','Õ':'O','Ö':'O',
    'ò':'o','ó':'o','ô':'o','õ':'o','ö':'o',
    'Ù':'U','Ú':'U','Û':'U','Ü':'U',
    'ù':'u','ú':'u','û':'u','ü':'u',
    'Ñ':'N','ñ':'n',
    'Œ':'OE','œ':'oe',
    'ß':'ss',
    'ÿ':'y','Ÿ':'Y',
  };
  return texte.split('').map(c => MAP[c] || c).join('');
}

export interface ReceiptData {
  titre: string;
  sousTitre?: string;
  numero: string;
  date: string;
  heure: string;
  lignes: { label: string; valeur: string }[];
  articles: { quantite: number; nom: string; prix: number; total: number }[];
  devise: string;
  remise?: { type: string; valeur: number; motif?: string } | null;
  total: number;
  modePaiement: string;
  piedPage?: string[];
}

@Injectable()
export class PrinterService {
  private readonly logger = new Logger(PrinterService.name);

  constructor(private configService: ConfigService) {}

  // ─── Configuration ───────────────────────────────────────────────

  getConfig(): PrinterConfig {
    return {
      type: (this.configService.get('PRINTER_TYPE') as PrinterConfig['type']) || 'WINDOWS',
      ip: this.configService.get('PRINTER_IP') || '192.168.1.100',
      port: parseInt(this.configService.get('PRINTER_PORT') || '9100', 10),
      name: this.configService.get('PRINTER_NAME') || 'EPSON-TM-T88V',
      shareName: this.configService.get('PRINTER_SHARE') || 'RECU',
      charWidth: parseInt(this.configService.get('PRINTER_CHAR_WIDTH') || '42', 10),
      autoPrint: this.configService.get('PRINTER_AUTO_PRINT') !== 'false',
    };
  }

  /** Retourne la config de l'imprimante pour une destination donnée.
   *  Si une config spécifique est définie (ex: PRINTER_NAME_CUISINE), elle est utilisée.
   *  Sinon, hérite de la config principale. */
  getConfigForDestination(destination: TicketDestination): PrinterConfig {
    const base = this.getConfig();
    const suffix = `_${destination}`;

    const type = this.configService.get(`PRINTER_TYPE${suffix}`) as PrinterConfig['type'];
    const ip = this.configService.get(`PRINTER_IP${suffix}`);
    const port = this.configService.get(`PRINTER_PORT${suffix}`);
    const name = this.configService.get(`PRINTER_NAME${suffix}`);
    const shareName = this.configService.get(`PRINTER_SHARE${suffix}`);
    const charWidth = this.configService.get(`PRINTER_CHAR_WIDTH${suffix}`);

    return {
      type: type || base.type,
      ip: ip || base.ip,
      port: port ? parseInt(port, 10) : base.port,
      name: name || base.name,
      shareName: shareName || base.shareName,
      charWidth: charWidth ? parseInt(charWidth, 10) : base.charWidth,
      autoPrint: base.autoPrint,
    };
  }

  updateConfigEnv(updates: Partial<PrinterConfig>): string {
    const envPath = path.join(process.cwd(), '.env');
    let content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');

    const mapping: Record<string, keyof PrinterConfig> = {
      PRINTER_TYPE: 'type',
      PRINTER_IP: 'ip',
      PRINTER_PORT: 'port',
      PRINTER_NAME: 'name',
      PRINTER_SHARE: 'shareName',
      PRINTER_CHAR_WIDTH: 'charWidth',
      PRINTER_AUTO_PRINT: 'autoPrint',
    };

    for (const [envKey, configKey] of Object.entries(mapping)) {
      if (updates[configKey] !== undefined) {
        const val = configKey === 'autoPrint'
          ? (updates.autoPrint ? 'true' : 'false')
          : String(updates[configKey]);
        const regex = new RegExp(`^${envKey}=.*`);
        const i = lines.findIndex(l => regex.test(l));
        if (i >= 0) {
          lines[i] = `${envKey}=${val}`;
        } else {
          lines.push(`${envKey}=${val}`);
        }
      }
    }

    fs.writeFileSync(envPath, lines.join('\n'), 'utf-8');
    for (const [envKey, configKey] of Object.entries(mapping)) {
      if (updates[configKey] !== undefined) {
        process.env[envKey] = configKey === 'autoPrint'
          ? (updates.autoPrint ? 'true' : 'false')
          : String(updates[configKey]);
      }
    }
    return 'Configuration mise à jour. Redémarrez le serveur pour appliquer complètement.';
  }

  // ─── Lister les imprimantes Windows ─────────────────────────────

  async listWindowsPrinters(): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name"`,
        { timeout: 8000 },
      );
      return stdout
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);
    } catch (err: any) {
      this.logger.warn(`Impossible de lister les imprimantes: ${err.message}`);
      return [];
    }
  }

  // ─── Test de connexion ───────────────────────────────────────────

  async testPrinter(): Promise<{ ok: boolean; message: string; debug?: string }> {
    const config = this.getConfig();

    if (config.type === 'NONE') {
      return { ok: false, message: 'Aucune imprimante configurée (PRINTER_TYPE=NONE)' };
    }

    if (config.type === 'NETWORK') {
      try {
        await this.sendRawToNetwork(config, CMDS.INIT + CMDS.FEED_LINE + CMDS.FEED_LINE);
        return { ok: true, message: `Imprimante réseau OK — ${config.ip}:${config.port}` };
      } catch (err: any) {
        return { ok: false, message: `Échec connexion ${config.ip}:${config.port} — ${err.message}` };
      }
    }

    if (config.type === 'WINDOWS') {
      return this.testWindowsPrinter(config);
    }

    return { ok: false, message: 'Type d\'imprimante inconnu' };
  }

  private async testWindowsPrinter(config: PrinterConfig): Promise<{ ok: boolean; message: string; debug?: string }> {
    const results: string[] = [];

    const testText = [
      '',
      '===== TEST IMPRESSION =====',
      '',
      'Si vous voyez ce ticket,',
      `l'imprimante "${config.name}"`,
      'est bien configuree !',
      '',
      new Date().toLocaleString('fr-FR'),
      '',
      '',
    ].join('\r\n');

    const tmpFile = path.join(os.tmpdir(), `test_recu_${Date.now()}.txt`);

    // Méthode 1 : Partage (copy /b) — avec commande cut ESC/POS
    if (config.shareName) {
      try {
        const cutCmd = '\x1d\x56\x01'; // GS V 1 = cut partiel
        fs.writeFileSync(tmpFile, testText + cutCmd, 'latin1');
        const sharePath = `\\\\localhost\\${config.shareName}`;
        await execAsync(`cmd /c "copy /b \"${tmpFile}\" \"${sharePath}\""`, { timeout: 10000 });
        results.push(`✅ Méthode 1 (copy /b \\\\localhost\\${config.shareName}) OK`);
        try { fs.unlinkSync(tmpFile); } catch {}
        return { ok: true, message: `Imprimante OK via partage \\\\localhost\\${config.shareName}`, debug: results.join(' | ') };
      } catch (err: any) {
        results.push(`❌ copy /b: ${err.message}`);
      }
    }

    // Méthode 2 : Out-Printer
    try {
      fs.writeFileSync(tmpFile, testText, 'latin1');
      const psScript = `Get-Content -Path '${tmpFile.replace(/'/g, "''")}' -Encoding Default | Out-Printer -Name '${config.name.replace(/'/g, "''")}'`;
      await execAsync(`powershell -NoProfile -Command "${psScript}"`, { timeout: 10000 });
      results.push('✅ Méthode 2 (Out-Printer) OK');
      try { fs.unlinkSync(tmpFile); } catch {}
      return { ok: true, message: `Imprimante OK via Out-Printer "${config.name}"`, debug: results.join(' | ') };
    } catch (err: any) {
      results.push(`❌ Out-Printer: ${err.message}`);
    }

    // Méthode 3 : print /d
    try {
      fs.writeFileSync(tmpFile, testText, 'latin1');
      await execAsync(`print /d:"${config.name}" "${tmpFile}"`, { timeout: 10000 });
      results.push('✅ Méthode 3 (print /d) OK');
      try { fs.unlinkSync(tmpFile); } catch {}
      return { ok: true, message: `Imprimante OK via print /d "${config.name}"`, debug: results.join(' | ') };
    } catch (err: any) {
      results.push(`❌ print /d: ${err.message}`);
    }

    // Lister les imprimantes disponibles
    const printers = await this.listWindowsPrinters();
    results.push(`Imprimantes disponibles: ${printers.join(', ') || 'aucune'}`);

    return {
      ok: false,
      message: `Aucune méthode n'a fonctionné pour "${config.name}". ` +
        `Vérifiez que l'imprimante est allumée et partagée (nom de partage: "${config.shareName}"). ` +
        `Imprimantes trouvées: ${printers.slice(0, 5).join(', ') || 'aucune'}`,
      debug: results.join(' | '),
    };
  }

  // ─── Impression reçu ─────────────────────────────────────────────

  async printReceipt(data: ReceiptData): Promise<{ ok: boolean; message: string }> {
    const config = this.getConfig();

    if (config.type === 'NONE') {
      return { ok: false, message: 'Impression désactivée (PRINTER_TYPE=NONE)' };
    }

    try {
      // Normaliser les données pour éviter les problèmes d'accents
      data = {
        ...data,
        titre: normalizeText(data.titre),
        sousTitre: data.sousTitre ? normalizeText(data.sousTitre) : undefined,
        numero: normalizeText(data.numero),
        lignes: data.lignes.map(l => ({ label: normalizeText(l.label), valeur: normalizeText(l.valeur) })),
        articles: data.articles.map(a => ({ ...a, nom: normalizeText(a.nom) })),
        modePaiement: normalizeText(data.modePaiement),
        piedPage: data.piedPage?.map(p => normalizeText(p)),
      };
      if (config.type === 'NETWORK') {
        // Réseau : ESC/POS direct via TCP
        const buffer = this.buildReceiptBuffer(data, config.charWidth);
        await this.sendRawToNetwork(config, buffer);
        return { ok: true, message: 'Reçu envoyé à l\'imprimante réseau' };
      }

      if (config.type === 'WINDOWS') {
        // Windows USB : texte simple via Out-Printer (le pilote filtre ESC/POS)
        let texte = this.buildPlainTextReceipt(data, config.charWidth);
        texte = normalizeText(texte);
        await this.sendTextToWindowsPrinter(config, texte);
        return { ok: true, message: `Reçu envoyé à "${config.name}"` };
      }

      return { ok: false, message: 'Type d\'imprimante inconnu' };
    } catch (err: any) {
      this.logger.error(`Erreur impression: ${err.message}`);
      return { ok: false, message: `Erreur impression: ${err.message}` };
    }
  }

  // ─── Génération buffer ESC/POS ───────────────────────────────────

  private buildReceiptBuffer(data: ReceiptData, width: number): Buffer {
    const buf: string[] = [];

    buf.push(CMDS.INIT);
    buf.push(CMDS.CP1252); // Code page Windows-1252 pour les accents français (é, è, à, etc.)

    // ── Entête ──
    buf.push(CMDS.ALIGN_CENTER);
    buf.push(CMDS.DOUBLE_HEIGHT_ON + CMDS.BOLD_ON);
    buf.push(this.padCenter(data.titre, width));
    buf.push(CMDS.DOUBLE_HEIGHT_OFF + CMDS.BOLD_OFF);
    if (data.sousTitre) {
      buf.push(this.padCenter(data.sousTitre, width));
    }
    buf.push(CMDS.FEED_LINE);

    // ── Infos ──
    buf.push(CMDS.ALIGN_LEFT);
    buf.push(this.dashedLine(width));
    buf.push(this.boldLabel(data.numero) + '  ' + data.date + ' ' + data.heure);
    for (const l of data.lignes) {
      buf.push(this.twoCol(l.label, l.valeur, width));
    }

    // ── Articles ──
    buf.push(this.dashedLine(width));
    buf.push(CMDS.BOLD_ON + 'Qté Article' + ' '.repeat(Math.max(0, width - 18)) + 'Total' + CMDS.BOLD_OFF);

    for (const art of data.articles) {
      const qte = `x${art.quantite}`;
      const nom = art.nom.length > width - 17 ? art.nom.substring(0, width - 17) : art.nom;
      const prix = `${art.total.toFixed(2)} ${data.devise}`;
      const esp = Math.max(1, width - qte.length - nom.length - prix.length);
      buf.push(`${qte} ${nom}${' '.repeat(esp)}${prix}`);
    }

    buf.push(this.dashedLine(width));

    // ── Remise ──
    if (data.remise) {
      const remLabel = data.remise.type === 'POURCENTAGE'
        ? `Remise ${data.remise.valeur}%`
        : `Remise ${data.remise.valeur.toFixed(2)} ${data.devise}`;
      const motif = data.remise.motif ? ` (${data.remise.motif})` : '';
      buf.push(this.twoCol(remLabel + motif, '', width));
    }

    // ── Total ──
    buf.push(CMDS.FEED_LINE);
    buf.push(CMDS.DOUBLE_HEIGHT_ON + CMDS.BOLD_ON);
    buf.push(this.twoCol('TOTAL', `${data.total.toFixed(2)} ${data.devise}`, width));
    buf.push(CMDS.DOUBLE_HEIGHT_OFF + CMDS.BOLD_OFF);
    buf.push(`${data.modePaiement}`);
    buf.push(CMDS.FEED_LINE);

    // ── Pied ──
    buf.push(this.dashedLine(width));
    buf.push(CMDS.ALIGN_CENTER);
    if (data.piedPage && data.piedPage.length > 0 && data.piedPage[0] !== data.titre) {
      buf.push(this.padCenter(data.piedPage[0], width));
    }
    const now = new Date();
    buf.push(this.padCenter(now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR'), width));

    // ── Fin ──
    buf.push(CMDS.FEED_LINE);
    buf.push(CMDS.FEED_LINE);
    buf.push(CMDS.CUT_PARTIAL);

    // CR+LF obligatoire pour les imprimantes ESC/POS
    // Latin-1 préserve les accents français (é, è, à, ç) en single-byte
    return Buffer.from(buf.join('\r\n'), 'latin1');
  }

  // ─── Envoi réseau TCP ────────────────────────────────────────────

  private sendRawToNetwork(config: PrinterConfig, data: string | Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      const timeout = setTimeout(() => {
        client.destroy();
        reject(new Error('Timeout connexion imprimante'));
      }, 5000);

      client.connect(config.port, config.ip, () => {
        clearTimeout(timeout);
        client.write(data, (err) => {
          if (err) {
            client.destroy();
            reject(err);
            return;
          }
          setTimeout(() => {
            client.destroy();
            resolve();
          }, 1000);
        });
      });

      client.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  // ─── Impression ticket générique (réception, cuisine, bar) ──────

  async printTicket(contenu: string, destination?: TicketDestination): Promise<{ ok: boolean; message: string }> {
    const config = destination ? this.getConfigForDestination(destination) : this.getConfig();
    const texteNormalise = normalizeText(contenu);
    if (config.type === 'NONE') {
      return { ok: false, message: 'Impression désactivée' };
    }
    try {
      if (config.type === 'NETWORK') {
        await this.sendRawToNetwork(config, Buffer.from(texteNormalise + '\r\n\r\n\r\n' + CMDS.CUT_PARTIAL, 'latin1'));
        return { ok: true, message: `Ticket${destination ? ' ' + destination : ''} envoyé` };
      }
      if (config.type === 'WINDOWS') {
        await this.sendTextToWindowsPrinter(config, texteNormalise);
        return { ok: true, message: `Ticket${destination ? ' ' + destination : ''} envoyé à "${config.name}"` };
      }
      return { ok: false, message: 'Type inconnu' };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  }

  // ─── Génération ticket texte simple (sans ESC/POS) ──────────────

  private buildPlainTextReceipt(data: ReceiptData, width: number): string {
    const lines: string[] = [];

    // Entête centré
    lines.push(this.padCenter(data.titre.toUpperCase(), width));
    if (data.sousTitre) {
      lines.push(this.padCenter(data.sousTitre, width));
    }
    lines.push(this.dashedLine(width));

    // Infos
    lines.push(data.numero + '  ' + data.date + '  ' + data.heure);
    for (const l of data.lignes) {
      lines.push(this.twoCol(l.label, l.valeur, width));
    }
    lines.push(this.dashedLine(width));

    // Articles
    lines.push('Qte  Article' + ' '.repeat(Math.max(0, width - 20)) + 'Total');
    lines.push('');

    for (const art of data.articles) {
      const qte = `x${art.quantite}`;
      const nom = art.nom.length > width - 18 ? art.nom.substring(0, width - 18) : art.nom;
      const prix = `${art.total.toFixed(2)} ${data.devise}`;
      const esp = Math.max(1, width - qte.length - nom.length - prix.length);
      lines.push(`${qte} ${nom}${' '.repeat(esp)}${prix}`);
    }

    lines.push(this.dashedLine(width));

    // Remise
    if (data.remise) {
      const remLabel = data.remise.type === 'POURCENTAGE'
        ? `Remise ${data.remise.valeur}%`
        : `Remise ${data.remise.valeur.toFixed(2)} ${data.devise}`;
      lines.push(this.twoCol(remLabel, '', width));
    }

    // Total
    lines.push('');
    lines.push(this.twoCol('TOTAL', `${data.total.toFixed(2)} ${data.devise}`, width));
    lines.push(data.modePaiement);
    lines.push(this.dashedLine(width));

    // Pied
    if (data.piedPage && data.piedPage.length > 0 && data.piedPage[0] !== data.titre) {
      lines.push(this.padCenter(data.piedPage[0], width));
    }
    const now = new Date();
    lines.push(this.padCenter(now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR'), width));

    // Sauts avant découpe
    lines.push('');
    lines.push('');
    lines.push('');

    return lines.join('\r\n');
  }

  // ─── Envoi texte vers imprimante Windows ─────────────────────────

  private async sendTextToWindowsPrinter(config: PrinterConfig, texte: string): Promise<void> {
    const tmpFile = path.join(os.tmpdir(), `recu_${Date.now()}.txt`);
    const errors: string[] = [];

    try {
      // Méthode 1 : Partage Windows (copy /b) — envoi brut + commande cut ESC/POS
      if (config.shareName) {
        try {
          // copy /b envoie les bytes bruts → on peut utiliser les commandes ESC/POS
          // Ajouter GS V 1 (cut partiel) à la fin pour déclencher la découpe
          const cutCmd = '\x1d\x56\x01';
          fs.writeFileSync(tmpFile, texte + cutCmd, 'latin1');
          const sharePath = `\\\\localhost\\${config.shareName}`;
          this.logger.log(`copy /b vers ${sharePath} (avec cut)...`);
          await execAsync(`cmd /c "copy /b \"${tmpFile}\" \"${sharePath}\""`, { timeout: 15000 });
          this.logger.log(`copy /b OK`);
          return;
        } catch (err: any) {
          errors.push(`copy /b: ${err.message}`);
          this.logger.warn(`copy /b échoué: ${err.message}`);
        }
      }

      // Méthode 2 : Out-Printer PowerShell (pas de cut possible via driver)
      try {
        fs.writeFileSync(tmpFile, texte, 'latin1');
        const psScript = `Get-Content -Path '${tmpFile.replace(/'/g, "''")}' -Encoding Default | Out-Printer -Name '${config.name.replace(/'/g, "''")}'`;
        this.logger.log(`Out-Printer vers "${config.name}"...`);
        await execAsync(`powershell -NoProfile -Command "${psScript}"`, { timeout: 15000 });
        this.logger.log(`Out-Printer OK`);
        return;
      } catch (err: any) {
        errors.push(`Out-Printer: ${err.message}`);
        this.logger.warn(`Out-Printer échoué: ${err.message}`);
      }

      // Méthode 3 : Commande print
      try {
        fs.writeFileSync(tmpFile, texte, 'latin1');
        await execAsync(`print /d:"${config.name}" "${tmpFile}"`, { timeout: 15000 });
        this.logger.log(`print /d OK`);
        return;
      } catch (err: any) {
        errors.push(`print /d: ${err.message}`);
      }

      throw new Error(errors.join(' | '));
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }

  // ─── Utilitaires formatage ───────────────────────────────────────

  private padCenter(text: string, width: number): string {
    const pad = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(pad) + text;
  }

  private dashedLine(width: number): string {
    return '-'.repeat(width);
  }

  private boldLabel(text: string): string {
    return CMDS.BOLD_ON + text + CMDS.BOLD_OFF;
  }

  private twoCol(left: string, right: string, width: number): string {
    const space = Math.max(1, width - left.length - right.length);
    return left + ' '.repeat(space) + right;
  }
}
