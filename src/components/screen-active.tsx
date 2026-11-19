import React from 'react';

/**
 * Verdadeiro quando esta tela é a ATIVA do pager de telas. O pager monta a
 * vizinha com antecedência durante o arraste (para ela acompanhar o dedo),
 * mas efeitos de "tela aberta" — como o Sino marcar notificações como lidas —
 * só podem rodar quando a tela está de fato ativa. O padrão é true para a
 * tela funcionar também fora do pager (rota direta, testes).
 */
export const ScreenActiveContext = React.createContext(true);
