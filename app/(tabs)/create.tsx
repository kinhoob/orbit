import React from 'react';
import { SearchScreen } from '../../src/features/search/screen';

// Aba Criar: a troca de telas por arraste mora no pager de telas do layout
// (Explorar à direita, Busca à esquerda); com o teclado aberto o gesto fica
// suspenso para não atrapalhar a digitação da avaliação.
export default function Create() {
  return <SearchScreen intent="review" />;
}
