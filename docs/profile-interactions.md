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
  existisse. Deixar de seguir DESFAZ a amizade (confirmação do Marco na
  mesma conversa: "se um dos dois deixar de seguir, quer que deixe de ser
  amigo e perca a permissão de mandar novas mensagens?" — "sim"): o gatilho
  `follows_unfriend_on_unfollow` remove a amizade aceita quando o seguir
  mútuo se desfaz, e a permissão de novas mensagens acaba junto, porque o
  envio exige amizade ativa. O gatilho só age quando o par era mútuo, então
  uma amizade nascida de pedido manual não é apagada por um seguir de mão
  única. O histórico de mensagens já trocadas não é apagado.
- Mensagens: a confirmação do Marco diz que amigos "podem trocar mensagem".
  A conversa existe agora (seção Mensagens abaixo) e a permissão parte sempre
  da amizade (`orbit_private.are_friends`), nunca do seguir sozinho.
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

- A denúncia fica no menu de opções do perfil (botão de três pontinhos, como
  em outras redes sociais), ao lado do bloqueio — pedido do Marco em
  22/11/2026: "a parte de denunciar fica com um tres tracinhos como em
  qualquer outra rede social, com varios opções".
- Migration `20261123011000_reports.sql` (em revisão, NÃO aplicada): tabela
  `public.reports` com motivos fixos (spam, discurso de ódio, assédio,
  conteúdo impróprio, outro) e detalhe opcional de até 500 caracteres.
- A moderação NÃO existe: a denúncia só fica registrada. A interface diz isso
  explicitamente e sugere o bloqueio para efeito imediato — nunca promete
  análise, envio ou consequência.
- Só a pessoa que denunciou relê as próprias denúncias; o denunciado não vê
  nada e não há fila de moderação. Sem edição nem exclusão pela interface.

## Mensagens entre amigos

- Migration `20261123012000_messages.sql` (em revisão, NÃO aplicada): tabela
  `public.messages` com RLS. Ler: só as duas participantes da conversa, e só
  enquanto não houver bloqueio entre elas (bloqueio esconde o histórico,
  como já esconde perfil e números). Enviar: somente para amigo — amizade
  aceita e sem bloqueio, verificado pelo banco a cada envio. Sem edição nem
  exclusão pela API; a função `mark_conversation_read` marca como lidas só
  as mensagens recebidas por quem chama.
- A conversa abre pelo botão "Enviar mensagem" no perfil de um amigo e pela
  lista de conversas (link "Mensagens" na tela de Amizades), com contagem de
  não lidas. Envio otimista com reversão em erro.
- Sem moderação de conteúdo: as mensagens ficam entre as duas pessoas e
  ninguém mais lê. Nada é prometido além disso.
- Enquanto a migration não é aplicada, a conversa e a lista explicam o
  estado "em revisão" em vez de fingir que mensagens existem.
- Se a amizade acaba (incluindo por deixar de seguir), o envio para na hora
  (o RLS exige amizade a cada envio); o histórico continua legível para as
  duas participantes, a menos que haja bloqueio.

## Limites desta entrega

- Nenhuma migration foi aplicada a um projeto remoto; seguir, denunciar,
  mensagens e os números novos ficam em estado honesto de "em revisão" até
  a aplicação.
- Sem lista pública de seguidores/seguindo: só as contagens, como antes com
  amigos. Quem segue quem não vira exposição nova.
- Notificações de "novo seguidor" não existem (a migration de notificações
  segue em revisão e não foi alterada).
