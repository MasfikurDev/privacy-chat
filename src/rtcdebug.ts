/**
 * Debug helper: wraps RTCPeerConnection to track every connection the
 * library creates, and exposes a one-line summary for the debug panel.
 */
const live = new Set<RTCPeerConnection>();

export function rtcSummary(): string {
  const sig: Record<string, number> = {};
  const ice: Record<string, number> = {};
  live.forEach((pc) => {
    sig[pc.signalingState] = (sig[pc.signalingState] ?? 0) + 1;
    if (pc.iceConnectionState !== 'new') {
      ice[pc.iceConnectionState] = (ice[pc.iceConnectionState] ?? 0) + 1;
    }
  });
  const fmt = (o: Record<string, number>) =>
    Object.entries(o).map(([k, v]) => `${k}:${v}`).join(' ') || '-';
  return `pcs ${live.size} | signaling ${fmt(sig)} | ice ${fmt(ice)}`;
}

export function instrumentRtc(log: (line: string) => void): void {
  const w = window as unknown as { __rtcPatched?: boolean; RTCPeerConnection: typeof RTCPeerConnection };
  if (w.__rtcPatched) return;
  w.__rtcPatched = true;
  const Orig = w.RTCPeerConnection;
  let count = 0;
  const seen = new Set<string>();

  function Patched(config?: RTCConfiguration): RTCPeerConnection {
    const pc = new Orig(config);
    const id = ++count;
    live.add(pc);
    pc.addEventListener('signalingstatechange', () => {
      const s = pc.signalingState;
      if (s === 'closed') live.delete(pc);
      if (s === 'have-remote-offer' || s === 'stable') {
        log(`pc#${id} signaling=${s}`);
      }
    });
    pc.addEventListener('iceconnectionstatechange', () => {
      if (pc.iceConnectionState !== 'new') log(`pc#${id} ice=${pc.iceConnectionState}`);
    });
    pc.addEventListener('connectionstatechange', () => {
      if (pc.connectionState === 'closed') live.delete(pc);
      if (pc.connectionState !== 'new') log(`pc#${id} conn=${pc.connectionState}`);
    });
    pc.addEventListener('icecandidate', (e) => {
      if (!e.candidate) return;
      const kind = `${e.candidate.type}/${e.candidate.protocol}`;
      if (!seen.has(kind)) {
        seen.add(kind);
        log(`first ${kind} candidate seen`);
      }
    });
    pc.addEventListener('icecandidateerror', (e) => {
      const err = e as RTCPeerConnectionIceErrorEvent;
      log(`pc#${id} ice error ${err.errorCode} ${err.url}`);
    });
    return pc;
  }
  Patched.prototype = Orig.prototype;
  Patched.generateCertificate = Orig.generateCertificate.bind(Orig);
  w.RTCPeerConnection = Patched as unknown as typeof RTCPeerConnection;
}
