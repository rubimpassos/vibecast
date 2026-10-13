/* Executar no Web UI local do transmissor, após login normal. Somente leitura. */
(function (root) {
    "use strict";

    function summarize(body) {
        if (!body || typeof body !== "object" || typeof body.enabled !== "boolean") {
            return { schema: 1, probe: "vibeshine-capabilities", status: "invalid-response" };
        }
        const codecs = {};
        for (const name of ["h264", "hevc", "av1"]) {
            codecs[name] = {
                supported: body.codecs?.[name]?.supported === true,
                hdr: body.codecs?.[name]?.hdr === true
            };
        }
        const states = ["ready", "unverified", "disabled"];
        return {
            schema: 1,
            probe: "vibeshine-capabilities",
            status: "observed",
            enabled: body.enabled,
            availability: states.includes(body.availability?.state) ? body.availability.state : "unknown",
            codecs,
            sessionAuthorization: "unverified",
            viewOnlyEnforcement: "unverified"
        };
    }

    async function probe(runtime = root) {
        const origin = new URL(runtime.location.origin);
        if (origin.protocol !== "https:" || !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) {
            throw new Error("Execute no Web UI HTTPS local do transmissor.");
        }
        const response = await runtime.fetch(new URL("/api/webrtc/capabilities", origin).href, {
            method: "GET",
            credentials: "same-origin",
            redirect: "error",
            cache: "no-store",
            headers: { Accept: "application/json" },
            signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) {
            return {
                schema: 1, probe: "vibeshine-capabilities", status: "http-error",
                httpStatus: response.status
            };
        }
        return summarize(await response.json());
    }

    root.vibecastBackendProbe = probe;
    if (typeof module !== "undefined" && module.exports) module.exports = { probe, summarize };
})(globalThis);
