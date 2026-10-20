import { useEffect, useRef, useState } from 'preact/hooks';
import { createSecret, openSession, type ReceivedFile, type Session } from './room';

interface Msg { mine: boolean; text: string }

const secretFromHash = () => location.hash.slice(1);
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function App() {
  const [secret, setSecret] = useState(secretFromHash());
  const [relayOnly, setRelayOnly] = useState(false);
  const [peers, setPeers] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [debug, setDebug] = useState<string[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callError, setCallError] = useState('');
  const [files, setFiles] = useState<ReceivedFile[]>([]);
  const [sendPct, setSendPct] = useState<number | null>(null);
  const [fileError, setFileError] = useState('');
  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const session = useRef<Session | null>(null);

  const addDebug = (line: string) =>
    setDebug((d) => {
      if (d[d.length - 1]?.endsWith(line)) return d;
      const next = [...d, `${new Date().toISOString().slice(11, 19)} ${line}`];
      // Keep the first 3 lines (build, room id, WebRTC support) pinned.
      return next.length > 40 ? [...next.slice(0, 3), ...next.slice(-37)] : next;
    });

  useEffect(() => {
    const onErr = (e: ErrorEvent) => addDebug(`error: ${e.message}`);
    const onRej = (e: PromiseRejectionEvent) => addDebug(`unhandled: ${String(e.reason)}`);
    window.addEventListener('error', onErr);
    window.addEventListener('unhandledrejection', onRej);
    return () => {
      window.removeEventListener('error', onErr);
      window.removeEventListener('unhandledrejection', onRej);
    };
  }, []);

  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    if (!secret) return;
    let cancelled = false;
    openSession(secret, relayOnly, {
      onPeerCount: setPeers,
      onMessage: (text) => setMsgs((m) => [...m, { mine: false, text }]),
      onDebug: addDebug,
      onRemoteStream: setRemoteStream,
      onFile: (f) => setFiles((l) => [...l, f])
    }).then((s) => {
      if (cancelled) s.leave();
      else session.current = s;
    }).catch((e) => addDebug(`openSession failed: ${errText(e)}`));
    return () => {
      cancelled = true;
      session.current?.leave();
      session.current = null;
      setPeers(0);
      setLocalStream(null);
      setRemoteStream(null);
    };
  }, [secret, relayOnly]);

  const startRoom = () => {
    const s = createSecret();
    location.hash = s;
    setSecret(s);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const send = (e: Event) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || peers === 0) return;
    session.current?.send(text);
    setMsgs((m) => [...m, { mine: true, text }]);
    setDraft('');
  };

  const startCall = async (video: boolean) => {
    setCallError('');
    try {
      const stream = await session.current?.startCall(video);
      if (stream) setLocalStream(stream);
    } catch (e) {
      setCallError(errText(e));
    }
  };

  const endCall = () => {
    session.current?.endCall();
    setLocalStream(null);
    setRemoteStream(null);
  };

  const onPickFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !session.current) return;
    setFileError('');
    setSendPct(0);
    try {
      await session.current.sendFile(file, (p) => setSendPct(Math.round(p * 100)));
      setMsgs((m) => [...m, { mine: true, text: `Sent file: ${file.name}` }]);
    } catch (err) {
      setFileError(errText(err));
    } finally {
      setSendPct(null);
    }
  };

  if (!secret) {
    return (
      <main>
        <h1>Privacy Chat</h1>
        <p>Private one-to-one chat straight between two devices.</p>
        <button onClick={startRoom}>Start a private room</button>
      </main>
    );
  }

  return (
    <main>
      <h1>Privacy Chat</h1>
      <p role="status">
        {peers === 0 && 'Waiting for the other person to open the link…'}
        {peers === 1 && 'Connected directly.'}
        {peers > 1 && 'This room is full. Only the first person can chat.'}
      </p>
      <p>
        <button onClick={copyLink}>{copied ? 'Link copied' : 'Copy invite link'}</button>{' '}
        <label>
          <input
            type="checkbox"
            checked={relayOnly}
            onChange={(e) => setRelayOnly((e.target as HTMLInputElement).checked)}
          />{' '}
          Hide my IP (relay only)
        </label>
      </p>

      <p class="calls">
        <button onClick={() => startCall(false)} disabled={peers === 0 || !!localStream}>Voice call</button>
        <button onClick={() => startCall(true)} disabled={peers === 0 || !!localStream}>Video call</button>
        <button onClick={endCall} disabled={!localStream && !remoteStream}>End call</button>
      </p>
      {remoteStream && !localStream && (
        <p role="status">The other person started a call. Join with Voice call or Video call.</p>
      )}
      {callError && <p role="alert">{callError}</p>}
      <div class="videos">
        <video ref={remoteVideo} autoPlay playsInline hidden={!remoteStream} />
        <video ref={localVideo} class="self" autoPlay playsInline muted hidden={!localStream} />
      </div>

      <ul class="msgs" aria-live="polite">
        {msgs.map((m, i) => (
          <li class={m.mine ? 'mine' : 'theirs'} key={i}>{m.text}</li>
        ))}
      </ul>
      <form onSubmit={send}>
        <input
          value={draft}
          onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
          placeholder="Type a message"
          maxLength={4000}
          aria-label="Message"
        />
        <button disabled={peers === 0}>Send</button>
      </form>

      <p>
        <label>
          Send a file (up to 50 MB){' '}
          <input type="file" onChange={onPickFile} disabled={peers === 0 || sendPct !== null} />
        </label>
      </p>
      {sendPct !== null && <progress value={sendPct} max={100} aria-label="Upload progress" />}
      {fileError && <p role="alert">{fileError}</p>}
      {files.length > 0 && (
        <ul class="files">
          {files.map((f, i) => (
            <li key={i}>
              {f.verified ? (
                <a href={f.url} download={f.name}>{f.name}</a>
              ) : (
                <span>{f.name} (failed integrity check, discarded)</span>
              )}{' '}
              ({kb(f.size)})
            </li>
          ))}
        </ul>
      )}

      <details>
        <summary>Debug info</summary>
        <button type="button" onClick={() => navigator.clipboard.writeText(debug.join('\n'))}>Copy debug</button>
        <pre id="debug">{debug.join('\n')}</pre>
      </details>
    </main>
  );
}
