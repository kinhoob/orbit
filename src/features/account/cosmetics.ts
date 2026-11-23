import { useQuery, useQueryClient } from '@tanstack/react-query';
import { requireSupabase } from '../../lib/supabase';
import { isMissingTableError } from '../../domain/favorites.mjs';
import { COSMETICS } from '../../domain/cosmetics.mjs';

// Personalização por nível (pedido do Marco em 23/11/2026): o catálogo chega
// pela migration 20261123040000, que fica em revisão no PR. Enquanto ela não
// é aplicada, o catálogo novo responde indisponível e a tela mantém as
// escolhas antigas funcionando — nunca item inventado.

export type Cosmetic = { kind: string; id: string; name: string; min_level: number };

let catalogMissing = false;

/** Verdadeiro quando o banco respondeu que o catálogo por nível ainda não existe. */
export function cosmeticsCatalogMissing(): boolean {
  return catalogMissing;
}

/** Catálogo público de cosméticos com nível mínimo; vazio enquanto em revisão. */
export function useCosmeticCatalog() {
  return useQuery({
    queryKey: ['cosmetic-catalog'],
    staleTime: 300000,
    queryFn: async (): Promise<Cosmetic[]> => {
      if (catalogMissing) return [];
      const { data, error } = await requireSupabase().from('cosmetic_catalog').select('kind,id,name,min_level');
      if (error) {
        if (isMissingTableError(error)) { catalogMissing = true; return []; }
        throw error;
      }
      return (data || []) as Cosmetic[];
    },
  });
}

export type CosmeticChoices = { profile_theme: string; avatar_frame: string; profile_badge: string; button_theme: string; profile_animation: string };

/** Salva as escolhas; o gatilho do banco confirma o nível de cada item. */
export async function saveCosmetics(userId: string, choices: CosmeticChoices): Promise<void> {
  const { error } = await requireSupabase().from('profiles').update(choices).eq('id', userId).select('id').single();
  if (error) {
    if (isMissingTableError(error)) { catalogMissing = true; throw new Error('Cosmetics backend unavailable'); }
    throw error;
  }
}

/** Catálogo local para telas que só precisam de nomes e cores (espelho da migration). */
export function fallbackCatalog(): Cosmetic[] {
  return COSMETICS.map((c) => ({ kind: c.kind, id: c.id, name: c.name, min_level: c.min_level }));
}
