const { test } = require("node:test");
const assert = require("node:assert/strict");
const { probe: rendererProbe } = require("./renderer-probe.cjs");
const { probe: backendProbe, summarize } = require("./backend-probe.cjs");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");

test("scripts expõem as sondas no console mesmo com module presente no renderer", () => {
    for (const [file, name] of [["renderer-probe.cjs", "vibecastRendererProbe"], ["backend-probe.cjs", "vibecastBackendProbe"]]) {
        const runtime = { module: { exports: {} } };
        runInNewContext(readFileSync(require("node:path").join(__dirname, file), "utf8"), runtime);
        assert.equal(typeof runtime[name], "function");
    }
});

test("renderer não chama getters de estado nem abre conexão de mídia", () => {
    let stateCalls = 0;
    let connections = 0;
    const result = rendererProbe({
        isSecureContext: true,
        RTCPeerConnection: function () { connections++; },
        MediaStream: function () {},
        Vencord: { Webpack: { findStore: () => ({
            getCurrentUserActiveStream() { stateCalls++; return { token: "private" }; }
        }) } },
        RTCRtpReceiver: { getCapabilities: () => ({ codecs: [
            { mimeType: "video/H264", sdpFmtpLine: "private" },
            { mimeType: "video/H264" }, { mimeType: "private" }
        ] }) }
    });
    assert.equal(stateCalls, 0);
    assert.equal(connections, 0);
    assert.deepEqual(result.receiverCodecs.video, ["video/h264"]);
    assert.equal(result.nativePlayerIntegration, "unverified");
    assert.equal(JSON.stringify(result).includes("private"), false);
});

test("renderer tolera APIs ausentes ou quebradas sem exportar mensagens de erro", () => {
    const runtime = { RTCRtpReceiver: { getCapabilities() { throw Error("private"); } } };
    Object.defineProperty(runtime, "Vencord", { get() { throw Error("private"); } });
    const result = rendererProbe(runtime);
    assert.equal(result.vencordWebpackApi, false);
    assert.equal(result.stores.MediaEngineStore.found, false);
    assert.deepEqual(result.receiverCodecs, { video: [], audio: [] });
    assert.equal(JSON.stringify(result).includes("private"), false);
});

test("backend rejeita origem remota ou HTTP antes de fazer requisições", async () => {
    for (const origin of ["http://localhost:47990", "https://example.com", "https://localhost.example.com"]) {
        await assert.rejects(backendProbe({ location: { origin }, fetch() { assert.fail("não deve buscar"); } }));
    }
});

test("backend usa só GET de capabilities, sem redirects nem criação de sessão", async () => {
    let requests = 0;
    const result = await backendProbe({
        location: { origin: "https://localhost:47990" },
        async fetch(url, options) {
            requests++;
            assert.equal(url, "https://localhost:47990/api/webrtc/capabilities");
            assert.equal(options.method, "GET");
            assert.equal(options.redirect, "error");
            assert.equal(options.credentials, "same-origin");
            assert.equal(options.body, undefined);
            return { ok: true, json: async () => ({ enabled: false, availability: { state: "disabled" } }) };
        }
    });
    assert.equal(requests, 1);
    assert.equal(result.enabled, false);
    assert.equal(result.availability, "disabled");
});

test("capacidade pronta não implica autorização ou bloqueio de input comprovados", () => {
    const result = summarize({
        enabled: true, availability: { state: "ready", reason: "private" },
        codecs: { h264: { supported: true, hdr: false, token: "private" } },
        addresses: ["private"], username: "private"
    });
    assert.equal(result.viewOnlyEnforcement, "unverified");
    assert.equal(result.sessionAuthorization, "unverified");
    assert.equal(result.codecs.h264.supported, true);
    assert.equal(JSON.stringify(result).includes("private"), false);
    assert.equal(summarize({ enabled: "true" }).status, "invalid-response");
});

test("erro HTTP não exporta corpo de resposta nem autenticação", async () => {
    const result = await backendProbe({
        location: { origin: "https://127.0.0.1:47990" },
        fetch: async () => ({ ok: false, status: 401, json() { assert.fail("corpo privado"); } })
    });
    assert.deepEqual(result, { schema: 1, probe: "vibeshine-capabilities", status: "http-error", httpStatus: 401 });
});
