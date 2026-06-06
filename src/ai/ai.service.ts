import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

interface MenuItem {
  id: number;
  nom: string;
  prix: number;
  categorieNom: string;
  variants?: { id: number; nom: string; prix: number }[];
}

export interface AssistantInput {
  message: string;
  menus: MenuItem[];
  restaurantNom?: string;
}

export interface AssistantOutput {
  articles: { menuId: number; quantite: number; variantId?: number; nom: string; prix: number }[];
  reponse: string;
}

@Injectable()
export class AiService {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
  }

  async commander(input: AssistantInput): Promise<AssistantOutput> {
    // Construire la liste des plats pour le prompt
    const menuTexte = input.menus
      .map((m) => {
        const base = `[ID:${m.id}] ${m.nom} — ${m.prix.toFixed(2)} € (${m.categorieNom})`;
        if (m.variants?.length) {
          const vars = m.variants.map((v) => `  • Variante [ID:${v.id}] ${v.nom} — ${v.prix.toFixed(2)} €`).join('\n');
          return base + '\n' + vars;
        }
        return base;
      })
      .join('\n');

    const systemPrompt = `Tu es un assistant de commande pour un restaurant appelé "${input.restaurantNom || 'menuGo'}".
Tu aides les clients à composer leur commande en interprétant leurs messages (texte ou retranscription vocale).

Voici le menu disponible aujourd'hui :
---
${menuTexte}
---

RÈGLES :
1. Analyse le message du client et retrouve les plats correspondants dans le menu ci-dessus.
2. Si un plat n'existe pas, propose le plus proche (ex: "poulet DG" → "poulet braisé").
3. Si un plat est ambigu, choisis le plus probable.
4. Si le client demande une variante spécifique, utilise le variantId correspondant.
5. La quantité par défaut est 1 sauf si le client précise (ex: "2 riz" → quantite: 2).
6. Calcule le prix total estimé.

Réponds UNIQUEMENT avec ce JSON (pas de texte avant/après) :
{
  "articles": [
    { "menuId": 123, "quantite": 2, "variantId": null, "nom": "Riz gras", "prix": 1500.00 }
  ],
  "reponse": "J'ai ajouté 2 Riz gras à votre commande. Total estimé : 3000.00 €. C'est tout ?"
}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: input.message,
          },
        ],
      });

      // Extraire le JSON de la réponse
      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as Anthropic.TextBlock).text)
        .join('');

      // Nettoyer la réponse (enlever les éventuels ```json ... ```)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {
          articles: [],
          reponse: "Désolé, je n'ai pas compris votre commande. Pouvez-vous reformuler ?",
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        articles: parsed.articles || [],
        reponse: parsed.reponse || 'Commande enregistrée !',
      };
    } catch (error: any) {
      // Fallback si l'API est indisponible
      console.error('AI Assistant error:', error.message);
      return {
        articles: [],
        reponse: "Désolé, l'assistant IA est temporairement indisponible. Veuillez commander manuellement.",
      };
    }
  }
}
