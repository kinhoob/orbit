import React from 'react';
import { SearchScreen } from '../../src/features/search/screen';
import { SwipeScreen } from '../../src/components/screen-swipe';

// Aba Busca: participa da troca de telas por arraste lateral (pedido do Marco
// em 19/11/2026) — Explorar à direita, Sino à esquerda. O fluxo de avaliação
// (Criar) usa a mesma tela sem o gesto, para não atrapalhar o formulário.
export default function SearchTab() {
  return <SwipeScreen route="search"><SearchScreen /></SwipeScreen>;
}
