import React from 'react';
import { SearchScreen } from '../../src/features/search/screen';
import { SwipeScreen } from '../../src/components/screen-swipe';

// Aba Criar: participa da troca de telas por arraste lateral (pedido do Marco
// em 19/11/2026) — Explorar à direita, Busca à esquerda. Com o teclado aberto
// o gesto fica suspenso para não atrapalhar a digitação da avaliação.
export default function Create() {
  return <SwipeScreen route="create"><SearchScreen intent="review" /></SwipeScreen>;
}
