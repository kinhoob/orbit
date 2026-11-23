# Interações no perfil de outras pessoas

Pedido do Marco em 22/11/2026: "no perfil dos outros adiciona botao pra
seguir, denunciar, curtir publicações ver timeline e etc", com o modelo
confirmado na mesma conversa: seguir sem aceite; quando a outra pessoa segue
de volta, os dois viram amigos e podem trocar mensagem.

## Seguir (unilateral, sem aceite)

- Migration `20261123010000_follows.sql` (em revisão, NÃO aplicada): tabela
  `public.follows` com RLS. Qualquer pessoa autenticada segue outra sem
  aprovação; bloqueio em qualquer direção impede o seguir e esconde a
  relação das leituras. Só se apaga o próprio seguir.
- Reciprocidade: o gatilho `follows_mutual_friendship` cria a amizade aceita
  quando o seguir fica mútuo, e aceita na hora um pedido pendente que já
  existisse. Deixar de seguir depois NÃO desfaz a amizade.
- Mensagens: a confirmação do Marco diz que amigos "podem trocar mensagem",
  mas o ORBIT ainda não tem conversas. Nada de chat foi implementado; quando
  existir, a permissão parte da amizade (`orbit_private.are_friends`).
- O botão Seguir/Seguindo fica no perfil logo abaixo dos números. Enquanto a
  migration não é aplicada, o perfil explica que o seguir chega com a
  atualização em revisão — nunca finge que seguiu.
- Os números do perfil (`profile_stats`) passam a incluir Seguidores e
  Seguindo. Enquanto a RPC antiga está no ar, o app simplesmente omite esses
  dois números em vez de mostrar zero inventado.

## Curtir publicações

A linha do tempo do perfil (próprio ou de outra pessoa) mostra o coração com
o total de curtidas. Em avaliações de outra pessoa, o toque curte/descurte
com atualização otimista e reversão em erro, reaproveitando a mesma regra do
Explorar (`rating_likes`). O RLS já impede curtir a própria avaliação, então
no próprio perfil o coração aparece só como contagem.

## Denunciar (registro, sem moderação)

- Migration `20261123011000_reports.sql` (em revisão, NÃO aplicada): tabela
  `public.reports` com motivos fixos (spam, discurso de ódio, assédio,
  conteúdo impróprio, outro) e detalhe opcional de até 500 caracteres.
- A moderação NÃO existe: a denúncia só fica registrada. A interface diz isso
  explicitamente e sugere o bloqueio para efeito imediato — nunca promete
  análise, envio ou consequência.
- Só a pessoa que denunciou relê as próprias denúncias; o denunciado não vê
  nada e não há fila de moderação. Sem edição nem exclusão pela interface.

## Limites desta entrega

- Nenhuma migration foi aplicada a um projeto remoto; seguir, denunciar e os
  números novos ficam em estado honesto de "em revisão" até a aplicação.
- Sem lista pública de seguidores/seguindo: só as contagens, como antes com
  amigos. Quem segue quem não vira exposição nova.
- Notificações de "novo seguidor" não existem (a migration de notificações
  segue em revisão e não foi alterada).
