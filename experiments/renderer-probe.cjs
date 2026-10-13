/* Diagnóstico passivo: não chama getters de estado nem inicia mídia. */
(function (root) {
    "use strict";

    const surfaces = {
        ApplicationStreamingStore: ["getCurrentUserActiveStream", "getAnyDiscoverableStreamForUser", "getViewerIds"],
        ApplicationStreamPreviewStore: ["getPreviewURL"],
        RunningGameStore: ["getRunningGames"],
        MediaEngineStore: ["getMediaEngine"],
        SelectedChannelStore: ["getVoiceChannelId"],
        VoiceStateStore: ["getVoiceStatesForChannel"]
    };

    function attempt(read, fallback) {
        try { return read(); } catch { return fallback; }
    }

    function probe(runtime = root) {
        const webpack = attempt(() => runtime.Vencord.Webpack, undefined);
        const stores = {};
        for (const [name, methods] of Object.entries(surfaces)) {
            const store = attempt(() => webpack.findStore(name), undefined);
            stores[name] = {
                found: Boolean(store),
                methods: Object.fromEntries(methods.map(method => [
                    method, attempt(() => typeof store[method] === "function", false)
                ]))
            };
        }
        const codecs = kind => attempt(() => {
            const caps = runtime.RTCRtpReceiver.getCapabilities(kind);
            // Não exportar parâmetros SDP, candidatos ICE ou endereços.
            const known = kind === "video"
                ? ["video/h264", "video/h265", "video/hevc", "video/av1", "video/vp8", "video/vp9"]
                : ["audio/opus", "audio/pcmu", "audio/pcma"];
            return [...new Set(caps.codecs
                .map(codec => String(codec.mimeType).toLowerCase())
                .filter(mime => known.includes(mime)))].sort();
        }, []);

        return {
            schema: 1,
            probe: "discord-renderer",
            secureContext: attempt(() => runtime.isSecureContext === true, false),
            peerConnectionApi: attempt(() => typeof runtime.RTCPeerConnection === "function", false),
            mediaStreamApi: attempt(() => typeof runtime.MediaStream === "function", false),
            vencordWebpackApi: attempt(() => typeof webpack.findStore === "function", false),
            receiverCodecs: { video: codecs("video"), audio: codecs("audio") },
            stores,
            nativePlayerIntegration: "unverified"
        };
    }

    root.vibecastRendererProbe = probe;
    if (typeof module !== "undefined" && module.exports) module.exports = { probe };
})(globalThis);
