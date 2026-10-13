# Experimentos de viabilidade

As sondas desta etapa consultam capacidades e presença de interfaces. Não criam sessões, capturam tela, abrem peers WebRTC ou substituem componentes do Discord. Os resultados não comprovam reprodução nem autorização de espectador.

## Diagnóstico do renderer

No Windows, o preparador coloca a sonda e sua chamada no clipboard, para executar com uma única colagem no console:

```powershell
.\experiments\prepare-windows.ps1 -Probe renderer
```

Ele não lê o clipboard nem instala ou configura aplicativos. Se a política local impedir execução de scripts, usar os passos manuais abaixo.

1. No Discord desktop Windows com Vencord, entrar na chamada usada no ensaio.
2. Abrir as ferramentas de desenvolvedor. Se indisponíveis nessa instalação, registrar esse bloqueio; o método de habilitação depende do cliente instalado.
3. Executar o conteúdo de [renderer-probe.cjs](renderer-probe.cjs) no console do renderer.
4. Executar `JSON.stringify(vibecastRendererProbe(), null, 2)` e salvar o resultado localmente.
5. Repetir nos dois PCs. Registrar à parte versão/canal do Discord e versão/revisão do Vencord, sem IDs de usuário ou canal.

A sonda verifica métodos por nome; não chama getters de estado dos stores. Codecs anunciados não comprovam decodificação nem aceleração por GPU. Um store presente não garante que o handler de sua ação esteja acessível ou que aceite mídia própria. APIs ausentes podem indicar versão incompatível ou módulos ainda não carregados.

## Diagnóstico da build do Vibeshine

O mesmo preparador atende ao transmissor:

```powershell
.\experiments\prepare-windows.ps1 -Probe backend
```

1. No PC transmissor, abrir o Web UI **HTTPS local** do Vibeshine e fazer login pelo fluxo normal. Usar uma instalação já preparada para o experimento; a sonda não instala nem inicia o serviço.
2. Executar o conteúdo de [backend-probe.cjs](backend-probe.cjs) no console dessa página.
3. Executar `JSON.stringify(await vibecastBackendProbe(), null, 2)`.

A única requisição é `GET /api/webrtc/capabilities`, com a autenticação já presente no navegador. Não copiar cookies, tokens ou senha para o repo ou espectador. A sonda aceita apenas localhost, 127.0.0.1 ou ::1; um certificado não confiável ou erro de rede deve ser resolvido na configuração local do experimento.

| Resultado | Interpretação |
| --- | --- |
| HTTP 401 ou 403 | Autenticação/permissão ainda não resolvida; não concluir que WebRTC está ausente |
| HTTP 404 | Endpoint não encontrado nessa build; conferir artefato e versão |
| enabled false | Build informa que WebRTC está desabilitado |
| enabled true e unverified | Código disponível, encoder ainda não verificado |
| enabled true e ready | Backend informa capacidades; negociação e decodificação ainda precisam de prova |
| invalid-response ou falha na execução | Diagnóstico inconclusivo; registrar erro sem dados de autenticação |

Os resultados têm campos permitidos explícitos. Não exportam respostas completas, parâmetros SDP, candidatos ICE ou mensagens de erro do backend. Guardar evidências brutas em `local-evidence/`, ignorado pelo Git; revisar qualquer relatório antes de publicá-lo.

## Sequência da primeira prova de mídia

Executar no laboratório Windows após os diagnósticos. A prova de mídia ainda não foi executada neste repo.

1. Registrar versões, hardware, jogo, resolução, fps e bitrate alvo. Conferir o hash do instalador com [fontes-inspecionadas.json](../docs/fontes-inspecionadas.json).
2. Escolher uma fonte explícita e validar isolamento provisório da captura. Não criar sessão sem fonte: o backend examinado permite desktop. Usar uma área de teste sem conteúdo privado até validar perda da fonte.
3. Em configuração isolada do backend, desabilitar mouse, keyboard e controller e testar o bloqueio efetivo. Não alterar a instalação pessoal silenciosamente. O isolamento global é provisório e não comprova permissão por sessão.
4. Validar H.264 SDR no cliente WebRTC upstream, usando credenciais administrativas somente no transmissor. Essa prova local de transporte não cumpre o aceite do Discord.
5. Implementar autorização temporária e sinalização restrita para o espectador antes de liberar acesso remoto. O espectador não recebe login ou sessão administrativa do Web UI. Testar revogação de peer conectado e de novas negociações.
6. Executar no renderer do Discord o receptor com transceivers recvonly. Negociar offer/answer e ICE pelo mecanismo restrito. A sequência de endpoints está documentada no inventário; nenhum broker está implementado ainda.
7. Ligar o MediaStream ao componente real do player identificado no mapeamento. Registrar quais superfícies são nativas e quais seriam substituídas. Se o player exigir substituição, apresentar a decisão de produto antes de expandir a implementação.
8. Com a voz do Discord ativa, verificar imagem e áudio do jogo; perder a fonte, fechar o jogo e encerrar. Verificar frames, áudio, processos, conexões e acesso após cada ação.
9. Testar tentativas de input por DataChannel JSON e binário. A ausência de controles no nosso receptor não comprova bloqueio no backend.
10. Rodar ensaios separados com Moonlight e Go Live no mesmo cenário. Usar filmagem simultânea para latência de imagem; RTT de WebRTC não equivale à latência da fonte à tela. Registrar fps, bitrate, perdas, CPU/GPU, upload e sincronização de áudio.

Se não houver captura isolada, autorização restrita ou bloqueio comprovado, registrar a etapa como pendente e concluir apenas o diagnóstico que foi realizado.

## Validação local das sondas

Com Node.js 22 ou posterior, na raiz do repo:

```sh
node experiments/probes.test.cjs
```

Os testes verificam ausência de chamadas de estado/captura, restrição de origem e método HTTP, tratamento de erro e filtragem dos dados exportados. Eles não usam Discord, GPU, Vibeshine ou rede real.
