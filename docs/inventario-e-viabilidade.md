# Inventário e viabilidade inicial

A revisão do código favorece WebRTC como primeiro experimento, mas ainda não comprova substituição da mídia no player desktop do Discord. A autorização por sessão, o modo somente espectador e a captura exclusiva precisam de adaptações e testes reais antes de liberar uma transmissão pelo Vibecast.

Referência de escopo: [issue #1](https://github.com/rubimpassos/vibecast/issues/1). Revisões e arquivos consultados: [fontes inspecionadas](fontes-inspecionadas.json). Inspeção em 13 de outubro de 2026.

## Versões e licenças

| Componente | Referência examinada | Licença e situação |
| --- | --- | --- |
| Vencord | main em `16ec4ea838899706019e7f472e45f055070abeb1`; package.json 1.15.11 | GPL-3.0-or-later declarada no package.json; instalado nos PCs ainda não conferido |
| Vibeshine | tag 2.0.0 em `0689b2e021d6106612a7ed72a34dacc714b7a133` | LICENSE com GPLv3; instalador relatado na issue precisa de conferência |
| libwebrtc do Vibeshine | manifesto windows-x64: Nonary/libwebrtc v1.0.2, upstream m125_release | Manifesto fixa revisões e hash; avisos e licenças transitivas precisam de inventário antes de distribuição |
| Discord desktop | Versão e canal a registrar nos dois PCs | Cliente proprietário; interfaces internas dependem da build |
| OBS portable, driver virtual, Tailscale e Moonlight | Versões instaladas a registrar | Dependências do experimento existente; não incorporadas ao repo. Levantar licenças dos artefatos exatos antes de empacotar |

Não há código de terceiros incorporado ao projeto nesta etapa. O manifesto de fontes não equivale a um inventário completo de licenças para distribuição.

## WebRTC confirmado no código

- [Opção de build](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/cmake/prep/options.cmake#L18): `SUNSHINE_ENABLE_WEBRTC` é desligada por padrão. O [workflow Windows](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/.github/workflows/ci-windows.yml#L613) a habilita e carrega libwebrtc. Confirmar a build instalada por `GET /api/webrtc/capabilities`.
- [Capabilities](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src/confighttp.cpp#L3257) distingue suporte desabilitado, encoder não verificado e encoder pronto; informa H.264, HEVC e AV1. Iniciar a negociação experimental com H.264 SDR e verificar o codec efetivo. HEVC/AV1 no host não garantem decodificação no Discord.
- [Cliente de navegador](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src_assets/common/assets/web-legacy/utils/webrtc/client.ts#L551) cria `RTCPeerConnection`, transceivers recvonly de vídeo/áudio e um `MediaStream`. Isso comprova um caminho de reprodução no navegador, ainda sem evidência no renderer do Discord.
- [Sinalização](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src_assets/common/assets/web-legacy/services/webrtcApi.ts#L121) usa criação de sessão, offer/answer, candidatos ICE por HTTP e consulta/SSE. O servidor retorna ICE servers e informações do certificado.
- O parâmetro `host_audio` não seleciona o processo do jogo. O caminho [WASAPI loopback](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src/platform/windows/audio.cpp#L409) captura um dispositivo; não encontramos nessa implementação a garantia de isolamento por processo. Validar roteamento dedicado provisório ou implementar captura por processo.

## Lacunas que mudam a implementação

**Autorização:** os endpoints de sessão passam por [authenticate](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src/confighttp.cpp#L3318). A camada [HTTP auth](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src/http_auth.cpp#L1500) aceita Bearer, sessão do Web UI e Basic. Tokens Bearer têm [escopo por rota e método](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src/http_auth.cpp#L199), mecanismo útil para investigar. Os handlers examinados não demonstram autorização vinculada à identidade Discord e à transmissão do Vibecast. Credenciais do Web UI ficam no transmissor; o espectador precisa de acesso temporário restrito. Revogar sinalização não encerra por si só um peer de mídia já conectado.

**Input:** o cliente abre um [DataChannel input](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src_assets/common/assets/web-legacy/utils/webrtc/client.ts#L562) e o servidor encaminha [mensagens de input](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src/webrtc_stream.cpp#L1527). Há [opções globais mouse, keyboard e controller](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src/config.cpp#L2121) e verificações em [input.cpp](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src/input.cpp#L495). São candidatas ao bloqueio do backend no experimento isolado, a validar com tentativas JSON e binárias. Não representam uma permissão por espectador; omitir DataChannel no nosso receptor não basta para impedir um cliente modificado.

**Fonte visual:** [start_webrtc_capture](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src/webrtc_stream.cpp#L3126) permite desktop quando não há app solicitado ou em execução. Seleção de aplicativo também não comprova captura exclusiva de sua janela. O controle precisa rejeitar fonte ausente e parar em perda do jogo, sem fallback para desktop, validando os frames realmente recebidos.

**Ciclo de vida:** existe [DELETE de sessão](https://github.com/Nonary/vibeshine/blob/0689b2e021d6106612a7ed72a34dacc714b7a133/src/confighttp.cpp#L3576) e fechamento do peer em `close_session`. Medir a liberação efetiva de captura, processos e display no Windows; não tratar remoção da sessão como prova de limpeza completa.

**Documentação e implementação:** architecture.md descreve exclusão estrita entre RTSP e WebRTC; o código desta tag contém caminhos de compartilhamento e rejeição condicionada ao app/adaptador em `start_webrtc_capture`. Os ensaios com Moonlight e WebRTC devem rodar separadamente, com encerramento completo entre eles, até testar essa interação.

## Matriz de integração do Discord

| Superfície | Evidência de código | Experimento necessário |
| --- | --- | --- |
| Seleção de jogo | RunningGameStore é exportado pelo Vencord | Identificar o seletor desktop real e relacionar escolha à fonte de captura |
| Prévia | ApplicationStreamPreviewStore.getPreviewURL; BiggerStreamPreview usa a prévia nativa | Verificar montagem de prévia local sem upload da mídia pelo Go Live |
| Iniciar e encerrar | Plugins usam STREAM_CREATE e STREAM_DELETE via Flux | Localizar handlers desktop; separar evento visual de chamada ao motor de mídia |
| Cartão e descoberta | ApplicationStreamingStore expõe streams e viewers | Provar descoberta entre dois clientes sem depender de transporte Go Live |
| Assistir | Stores permitem localizar streams, sem substituir a ação | Identificar handler real e negociar autorização temporária |
| Player | WebRTC produz MediaStream; nenhuma extensão estável de troca de origem comprovada | Identificar componente e ligação ao motor nativo na build instalada |
| Volume e tela cheia | Não comprovados para mídia própria | Testar controles existentes sobre a superfície de mídia escolhida |
| Limpeza | Vencord define start/stop para plugins | Encerrar recursos e revogar acessos ao parar plugin, jogo ou transmissão |

Fontes Vencord: [stores](https://github.com/Vendicated/Vencord/blob/16ec4ea838899706019e7f472e45f055070abeb1/src/webpack/common/stores.ts), [tipos do StreamingStore](https://github.com/Vendicated/Vencord/blob/16ec4ea838899706019e7f472e45f055070abeb1/packages/discord-types/src/stores/ApplicationStreamingStore.d.ts), [prévia](https://github.com/Vendicated/Vencord/blob/16ec4ea838899706019e7f472e45f055070abeb1/src/plugins/biggerStreamPreview/index.tsx), [eventos](https://github.com/Vendicated/Vencord/blob/16ec4ea838899706019e7f472e45f055070abeb1/src/plugins/streamerModeOnStream/index.ts), [lifecycle de plugin](https://github.com/Vendicated/Vencord/blob/16ec4ea838899706019e7f472e45f055070abeb1/src/utils/types.ts).

O [WebScreenShare](https://github.com/Vendicated/Vencord/blob/16ec4ea838899706019e7f472e45f055070abeb1/src/plugins/webScreenShare.browser/index.tsx#L265) intercepta getDisplayMedia na variante browser. Ele não comprova interceptação da captura desktop, nem troca o transporte Go Live. Não usar esse exemplo como prova de integração concluída.

## Decisão desta etapa

Avançar com sondas passivas da build instalada e do renderer, seguidas de uma prova de mídia controlada. Ainda não fixar a linguagem do companion nem implementar uma ponte que exponha a API administrativa ao espectador. A reutilização do player, seleção e descoberta continua aberta; qualquer redução para uma superfície substituta precisa da decisão prevista na issue.

A etapa 1 tem inventário de fontes e matriz inicial; resta preencher o inventário instalado e mapear os handlers reais. A etapa 2 tem caminho de sinalização identificado; não há sessão de mídia nem medição realizada em dois PCs.

