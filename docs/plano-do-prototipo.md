# Plano do protótipo Vibecast

Base: [issue #1](https://github.com/rubimpassos/vibecast/issues/1).

O primeiro marco é demonstrar, em dois PCs Windows com Vencord, o fluxo de iniciar, assistir e encerrar uma transmissão dentro do Discord, com vídeo e áudio transportados pelo backend próprio. A primeira prioridade é validar a integração com a UX do Discord e a capacidade real do transporte; essas provas orientam a escolha da arquitetura.

## Escopo e premissas

- Um transmissor e um espectador, conectados por Tailscale configurado pelos desenvolvedores.
- Seleção de um jogo aberto, prévia automática e voz da chamada independente da mídia do jogo.
- OBS e monitor virtual podem apoiar o experimento inicial, com a limitação registrada. Captura de desktop como fallback não é permitida.
- WebRTC do Vibeshine é o primeiro candidato, sujeito a confirmação na build usada. Receptor nativo baseado em Moonlight é uma alternativa a avaliar, com impacto explícito na integração do player.
- Instalação, captura definitiva sem monitor virtual e conectividade pública ficam para marcos posteriores.
- O protótipo Windows já descrito na issue comprova transmissão via Moonlight; não comprova reprodução no renderer nem reutilização do player do Discord.

## Etapa 1 Inventário e pontos de integração

Registrar as versões e revisões de Discord, Vencord, Vibeshine, OBS, driver do monitor virtual e Moonlight usados no teste. Levantar licenças, permissões necessárias e formas de extensão antes de incorporar ou distribuir componentes.

Mapear seleção do jogo, prévia, início, cartão da transmissão, descoberta pelo espectador, botão Assistir, player, volume, tela cheia e encerramento. Identificar componentes visuais, stores, eventos e interfaces com o motor nativo que cada ação exige. Para cada ponto, registrar se pode ser reutilizado, se depende de uma interface interna instável e como será verificado.

**Entrega:** inventário reproduzível e matriz de integração. As versões do protótipo existente precisam ser conferidas nos PCs; Vibeshine 2.0.0 é a versão relatada na issue.

**Critério de conclusão:** haver um experimento definido para cada ponto crítico da UX, sem presumir que Go Live aceita trocar o endereço de seu servidor de mídia.

## Etapa 2 Prova do transporte e da reprodução

Verificar na build escolhida a presença e o funcionamento de WebRTC: inicialização, sinalização, autenticação, codecs, decodificação no renderer do Discord e encerramento. Registrar também o suporte observado a múltiplos espectadores, sem expandir o marco inicial para vários espectadores.

Executar uma transmissão mínima entre os dois PCs por Tailscale. A reprodução isolada serve para validar transporte e decodificação; o aceite da UX exige reprodução dentro do Discord. Coletar evidências que diferenciem nosso fluxo de mídia do transporte Go Live, mantendo a voz da chamada ativa.

**Entrega:** procedimento de teste e resultado do experimento com versões, codecs e limitações observadas.

**Decisão:** continuar com WebRTC se funcionar no renderer e oferecer os controles de sessão necessários. Se não funcionar, avaliar o receptor nativo e demonstrar como sua imagem poderia entrar na superfície do player. Uma janela Moonlight ou página externa não conclui essa etapa de integração.

## Etapa 3 Sessão e controle local

Separar as responsabilidades em três componentes, sem fixar ainda a linguagem do componente local:

| Componente | Responsabilidade |
| --- | --- |
| Plugin Vencord | Seleção, prévia, ações de iniciar/assistir/encerrar e apresentação do estado no Discord |
| Componente local gerenciado | Captura, codificação, controle do backend, autorização e limpeza dos processos da sessão |
| Receptor | Receber e reproduzir mídia no Discord pelo transporte validado |

Definir contratos mínimos de seleção da fonte, preparação da prévia, início, autorização do espectador, assinatura de estado e encerramento. Proteger a interface local contra clientes não autorizados; escutar em loopback por si só não resolve autenticação.

Modelar os estados `ocioso → preparando → pronto → transmitindo → encerrando → ocioso`, incluindo falhas e desconexões. Distinguir sair como espectador de encerrar como transmissor. Encerramento, fechamento do jogo, saída do transmissor ou falha terminal devem parar captura e invalidar a sessão. Reiniciar exige uma sessão nova.

**Entrega:** contratos, modelo de estados e componente mínimo que inicia e encerra os recursos necessários sob demanda.

**Critério de conclusão:** executar ciclos consecutivos de início e encerramento sem processos de captura órfãos ou autorizações reutilizáveis. O usuário não deve precisar administrar Sunshine ou OBS.

## Etapa 4 Fluxo integrado ao Discord

Conectar os contratos às superfícies comprovadas na etapa 1. Implementar seleção e prévia no fluxo do transmissor; descoberta e Assistir no fluxo do espectador; reprodução, volume, tela cheia e encerramento na experiência da chamada.

Registrar para cada superfície se ela foi reutilizada ou substituída e como o estado chega ao outro cliente. A descoberta e a sinalização também precisam de um mecanismo comprovado; não assumir que o cartão nativo funciona automaticamente com transporte próprio.

**Entrega:** demonstração completa em dois PCs e matriz atualizada dos componentes nativos usados.

**Decisão de produto:** se for necessário substituir a superfície de vídeo, apresentar a diferença para decisão antes de alterar esse objetivo. Um painel paralelo não substitui o aceite da UX solicitada.

## Etapa 5 Autorização e isolamento

Implementar autorização temporária vinculada à sessão e ao espectador. Não entregar credenciais administrativas nem usar pareamento permanente como autorização final. Encerrar deve fechar a recepção ativa e invalidar novas tentativas com a autorização antiga.

Bloquear input de mouse, teclado e controle no backend, verificando tentativas reais pelo protocolo do receptor. Ocultar controles na interface não basta.

Validar a fonte escolhida na prévia e na recepção: alternar janelas, minimizar e fechar o jogo, perder a captura e desconectar o receptor. Em perda da fonte, parar ou mostrar uma superfície neutra, sem revelar o desktop. Investigar e testar captura de áudio por processo, verificando separadamente jogo, Discord, microfone e outro aplicativo.

**Entrega:** evidências de revogação, bloqueio de input e comportamento de captura/áudio.

**Critério de conclusão:** fonte visual isolada, revogação efetiva e ausência de controle remoto. Qualquer limitação de áudio deve constar no resultado; áudio misturado não satisfaz o objetivo de áudio exclusivo do jogo e impede declarar esse requisito concluído.

## Etapa 6 Comparação e decisão de viabilidade

Comparar Vibecast, Moonlight e Go Live usando o mesmo jogo, hardware, rede, resolução e taxa de quadros alvo. Registrar versões, configurações, aquecimento, duração e repetições. Separar latência de vídeo de atraso e sincronização de áudio; usar um método reproduzível de medição, como filmagem simultânea da fonte e do receptor.

Medir latência com distribuição dos resultados, fps recebido, perdas/interrupções, bitrate, upload, CPU/GPU e sincronização de áudio. Testar desconexão, reconexão autorizada, fechamento do jogo, falha do backend e ciclos consecutivos de transmissão. Não estabelecer superioridade nem metas numéricas antes de obter a referência comparável.

**Entrega:** relatório com resultados medidos, hipóteses restantes, limitações e decisão de continuar, revisar a arquitetura ou interromper a abordagem. Ao concluir, preparar o desdobramento em issues de captura sem monitor virtual, distribuição e conectividade sem Tailscale.

## Critérios de aceite consolidados

- [ ] Dois PCs iniciam e assistem a partir do Discord, com evidência dos componentes nativos reutilizados.
- [ ] A mídia vem do backend próprio, sem sessão Go Live carregando esse vídeo.
- [ ] A voz do Discord continua funcionando independentemente da transmissão.
- [ ] Encerrar corta a recepção e revoga o acesso; a próxima transmissão usa uma sessão nova.
- [ ] Tentativas de input pelo espectador são bloqueadas no backend.
- [ ] Prévia e recepção mostram apenas a fonte escolhida, inclusive durante falhas de captura.
- [ ] Volume, tela cheia, encerramento e comportamento de reconexão têm resultados registrados.
- [ ] O relatório distingue medições de hipóteses e declara limitações de áudio, captura, transporte e compatibilidade.
- [ ] O procedimento é reproduzível e não inclui configurações pessoais, endereços privados, tokens, senhas ou pareamentos.

## Organização sugerida do repositório

Criar os diretórios de implementação conforme cada experimento justificar sua necessidade:

```text
docs/             inventário, matriz de integração, decisões e procedimento de teste
experiments/      provas mínimas de transporte e integração
plugin/           plugin Vencord
companion/        componente local gerenciado
protocol/         contratos de controle e estados da sessão
```

Testes automatizados devem cobrir transições, revogação, bloqueio de input e limpeza de recursos. A integração com Discord, captura, áudio e desempenho exige testes reais nos dois PCs Windows; execução no ambiente cloud não substitui essa validação.

O próximo trabalho é a etapa 1 e as provas críticas da etapa 2. A escolha da stack e a implementação do fluxo completo dependem desses resultados.
