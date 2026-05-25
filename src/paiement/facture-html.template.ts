interface FactureData {
  numero: string;
  date: Date;
  restaurant: { nom: string; adresse: string; devise: string };
  table: string;
  serveur: string;
  caissier: string;
  modePaiement: string;
  articles: { quantite: number; nom: string; prix: number; total: number }[];
  total: number;
}

export function genererFactureHTML(data: FactureData): string {
  const d = data.restaurant.devise;
  const dateStr = new Date(data.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const heureStr = new Date(data.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Facture ${data.numero}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; background: #fff; color: #000; padding: 20px; max-width: 320px; margin: 0 auto; }
  .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
  .header h1 { font-size: 18px; margin-bottom: 4px; }
  .header p { font-size: 11px; color: #333; }
  .info { font-size: 11px; margin-bottom: 10px; }
  .info div { display: flex; justify-content: space-between; padding: 2px 0; }
  .divider { border-top: 1px dashed #000; margin: 10px 0; }
  table { width: 100%; font-size: 12px; border-collapse: collapse; }
  th { text-align: left; padding: 4px 0; font-size: 10px; border-bottom: 1px solid #ccc; }
  td { padding: 5px 0; border-bottom: 1px dotted #eee; }
  .qty { width: 30px; }
  .price { text-align: right; width: 70px; }
  .total-row { font-weight: bold; font-size: 16px; }
  .total-row td { padding-top: 10px; border: none; }
  .footer { text-align: center; font-size: 11px; margin-top: 20px; color: #666; }
  .footer p { margin: 4px 0; }
  @media print {
    body { padding: 5px; }
    .no-print { display: none; }
  }
  .no-print { text-align: center; margin-top: 20px; }
  .print-btn { background: #E86B2A; color: white; border: none; padding: 10px 30px; border-radius: 20px; font-size: 14px; cursor: pointer; }
</style>
</head>
<body>
  <div class="header">
    <h1>${data.restaurant.nom}</h1>
    <p>${data.restaurant.adresse}</p>
  </div>

  <div class="info">
    <div><span>Facture</span><strong>${data.numero}</strong></div>
    <div><span>Date</span><span>${dateStr} à ${heureStr}</span></div>
    <div><span>Table</span><strong>${data.table}</strong></div>
    <div><span>Serveur</span><span>${data.serveur}</span></div>
    <div><span>Caissier</span><span>${data.caissier}</span></div>
    <div><span>Paiement</span><span>${data.modePaiement}</span></div>
  </div>

  <div class="divider"></div>

  <table>
    <tr><th class="qty">Qté</th><th>Article</th><th class="price">P.U.</th><th class="price">Total</th></tr>
    ${data.articles.map((a) => `
    <tr>
      <td class="qty">x${a.quantite}</td>
      <td>${a.nom}</td>
      <td class="price">${a.prix.toFixed(2)} ${d}</td>
      <td class="price">${a.total.toFixed(2)} ${d}</td>
    </tr>`).join('')}
    <tr class="total-row">
      <td colspan="3" style="text-align:right;padding-right:8px">TOTAL</td>
      <td class="price">${data.total.toFixed(2)} ${d}</td>
    </tr>
  </table>

  <div class="footer">
    <p>Merci de votre visite !</p>
    <p>${data.restaurant.nom}</p>
  </div>

  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨 Imprimer</button>
  </div>

  <script>
    // Imprimer automatiquement à l'ouverture
    window.onload = () => setTimeout(() => window.print(), 500);
  </script>
</body>
</html>`;
}
