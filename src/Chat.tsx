import { Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Peer } from './inbox';
import { openSession, type PeerMediaState, type ReceivedFile, type Session } from './room';
import { HAS_TURN, MAX_MESSAGE_LENGTH } from './config';
import { Avatar, Icon, Modal, useRingtone } from './ui';

const SLOW_CONNECT_MS = 25000;

let msgIdCounter = 0;

interface Msg {
  mine: boolean;
  text: string;
  at: number;
  id: string;
}

interface ChatProps {
  secret: string;
  peer?: Peer;
  relayOnly: boolean;
  saved: boolean;
  onSave: () => void;
  onLeave: () => void;
}

const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const NL = String.fromCharCode(10);

export function Chat({ secret, peer, relayOnly, saved, onSave, onLeave }: ChatProps) {
  const [peers, setPeers] = useState(0);
  const [slow, setSlow] = useState(false);
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
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [peerMedia, setPeerMedia] = useState<PeerMediaState>({ muted: false, cameraOff: false });
  const [atBottom, setAtBottom] = useState(true);
  const [callStart, setCallStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const localVideo = useRef<HTMLVideoElement>(null);
  const remoteVideo = useRef<HTMLVideoElement>(null);
  const session = useRef<Session | null>(null);
  const msgsRef = useRef<HTMLUListElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addDebug = (line: string) =>
    setDebug((d: string[]) => {
      if (d[d.length - 1]?.endsWith(line)) return d;
      const next = [...d, `${new Date().toISOString().slice(11, 19)} ${line}`];
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
    if (peers > 0) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), SLOW_CONNECT_MS);
    return () => clearTimeout(t);
  }, [peers]);

  useEffect(() => {
    if (localVideo.current) localVideo.current.srcObject = localStream;
  }, [localStream]);
  useEffect(() => {
    if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
  }, [remoteStream]);

  useEffect(() => {
    let cancelled = false;
    openSession(secret, relayOnly, {
      onPeerCount: setPeers,
      onMessage: (text) => setMsgs((m: Msg[]) => [...m, { mine: false, text, at: Date.now(), id: `m${++msgIdCounter}` }]),
      onDebug: addDebug,
      onRemoteStream: setRemoteStream,
      onFile: (f) => setFiles((l: ReceivedFile[]) => [...l, f]),
      onCallEnded: () => {
        session.current?.endCall();
        setLocalStream(null);
        setRemoteStream(null);
        setMuted(false);
        setCameraOff(false);
        setPeerMedia({ muted: false, cameraOff: false });
        setCallStart(null);
      },
      onPeerMediaState: setPeerMedia
    })
      .then((s) => {
        if (cancelled) s.leave();
        else session.current = s;
      })
      .catch((e) => addDebug(`openSession failed: ${errText(e)}`));
    return () => {
      cancelled = true;
      session.current?.leave();
      session.current = null;
      setPeers(0);
      setLocalStream(null);
      setRemoteStream(null);
    };
  }, [secret, relayOnly]);

  useEffect(() => {
    if (localStream) {
      setCallStart(Date.now());
    } else {
      setCallStart(null);
    }
  }, [localStream]);

  useEffect(() => {
    if (callStart === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [callStart]);

  useEffect(() => {
    const el = msgsRef.current;
    if (!el) return;
    if (atBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [msgs, atBottom]);

  const onScroll = () => {
    const el = msgsRef.current;
    if (!el) return;
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${location.origin}${location.pathname}#${secret}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const send = (e: Event) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || peers === 0) return;
    session.current?.send(text);
    setMsgs((m: Msg[]) => [...m, { mine: true, text, at: Date.now(), id: `m${++msgIdCounter}` }]);
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

  const declineCall = () => {
    session.current?.declineCall();
    setRemoteStream(null);
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStream?.getAudioTracks().forEach((t: MediaStreamTrack) => {
      t.enabled = !next;
    });
    session.current?.setMediaState({ muted: next, cameraOff });
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    setCameraOff(next);
    localStream?.getVideoTracks().forEach((t: MediaStreamTrack) => {
      t.enabled = !next;
    });
    session.current?.setMediaState({ muted, cameraOff: next });
  };

  const incoming = !!remoteStream && !localStream;
  const incomingVideo = !!remoteStream && remoteStream.getVideoTracks().length > 0;
  const calling = !!localStream && !remoteStream;
  const peerName = peer?.name || 'Someone';
  useRingtone(incoming);

  const onPickFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !session.current) return;
    setFileError('');
    setSendPct(0);
    try {
      await session.current.sendFile(file, (p: number) => setSendPct(Math.round(p * 100)));
      setMsgs((m: Msg[]) => [...m, { mine: true, text: `Sent file: ${file.name}`, at: Date.now(), id: `m${++msgIdCounter}` }]);
    } catch (err) {
      setFileError(errText(err));
    } finally {
      setSendPct(null);
    }
  };

  const jumpToLatest = () => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setAtBottom(true);
  };

  const onTextareaInput = (e: Event & { currentTarget: EventTarget & { value: string } }) => {
    setDraft(e.currentTarget.value);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(e as unknown as Event);
    }
  };

  const formatTimer = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(sec).padStart(2, '0');
    if (h > 0) return `${h}:${mm}:${ss}`;
    return `${m}:${ss}`;
  };

  const dayLabel = (at: number, prev: number | null) => {
    if (prev === null) return null;
    const d1 = new Date(at).toDateString();
    const d2 = new Date(prev).toDateString();
    if (d1 === d2) return null;
    const today = new Date().toDateString();
    const yest = new Date(Date.now() - 86400000).toDateString();
    if (d1 === today) return 'Today';
    if (d1 === yest) return 'Yesterday';
    return new Date(at).toLocaleDateString();
  };

  return (
    <section class='mx-auto flex h-full min-h-0 w-full max-w-5xl min-w-0 flex-1 flex-col gap-3 overflow-hidden p-2 sm:gap-4 sm:p-4' aria-label='Private conversation'>
      <header class='flex min-w-0 items-center gap-2 border-b border-base-300 pb-3'>
        <button class='btn btn-ghost btn-circle btn-sm shrink-0' type='button' aria-label='Back to chats' onClick={onLeave}>
          <Icon name='back' size={20} />
        </button>
        <span class='shrink-0'><Avatar id={peer?.id ?? secret} label={peer?.name || 'Private room'} /></span>
        <div class='flex min-w-0 flex-1 flex-col gap-1'>
          <strong class='truncate text-base font-semibold'>{peer?.name || 'Private room'}</strong>
          <span class={`badge badge-sm self-start ${peers === 1 ? 'badge-success' : 'badge-ghost'}`} role='status'>
            {peers === 0 && 'Waiting…'}
            {peers === 1 && 'Connected'}
            {peers > 1 && 'Room full'}
          </span>
        </div>
        {peer && !saved && (
          <button class='btn btn-outline btn-sm min-h-10 shrink-0' type='button' onClick={onSave}>
            Save contact
          </button>
        )}
      </header>

      {!peer && (
        <div class='alert flex flex-col items-start gap-2 sm:flex-row sm:items-center'>
          <span class='flex-1 text-sm'>Private invite link. Send it to the other person.</span>
          <button class='btn btn-primary btn-sm' type='button' onClick={copyLink}>{copied ? 'Link copied' : 'Copy invite link'}</button>
        </div>
      )}
      {relayOnly && HAS_TURN && <p class='text-sm text-base-content/70'>Relay-only mode is on: traffic goes through the TURN relay.</p>}
      {relayOnly && !HAS_TURN && <p class='text-sm text-base-content/70'>Relay-only mode is ignored because no TURN server is configured.</p>}
      {slow && peers === 0 && (
        <div class='alert alert-warning text-sm' role='status'>
          {HAS_TURN
            ? 'Still connecting. Make sure the other person has the same link open.'
            : 'Still connecting. If you are on different networks (e.g. mobile data), a direct connection may be blocked and a TURN relay is needed.'}
        </div>
      )}

      <div class='grid min-w-0 grid-cols-2 items-center gap-2 sm:flex sm:flex-wrap'>
        <button class='btn btn-secondary btn-sm min-h-11 min-w-0 gap-2' type='button' onClick={() => startCall(false)} disabled={peers === 0 || !!localStream}>
          <Icon name='phone' size={18} />
          <span>Voice call</span>
        </button>
        <button class='btn btn-secondary btn-sm min-h-11 min-w-0 gap-2' type='button' onClick={() => startCall(true)} disabled={peers === 0 || !!localStream}>
          <Icon name='video' size={18} />
          <span>Video call</span>
        </button>
        <button class='btn btn-ghost btn-circle btn-sm justify-self-center' type='button' disabled={!localStream} aria-pressed={muted} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'} onClick={toggleMute}>
          <Icon name={muted ? 'mic-off' : 'mic'} />
        </button>
        <button class='btn btn-ghost btn-circle btn-sm justify-self-center' type='button' disabled={!localStream} aria-pressed={cameraOff} aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'} onClick={toggleCamera}>
          <Icon name={cameraOff ? 'video-off' : 'video'} />
        </button>
        {localStream && <span class='badge badge-outline col-span-2 justify-self-center sm:col-span-1'>{formatTimer(now - (callStart ?? now))}</span>}
        {(peerMedia.muted || peerMedia.cameraOff) && (
          <span class='col-span-2 text-center text-xs text-base-content/70 sm:col-span-1 sm:text-left'>
            {peerMedia.muted ? 'Peer muted' : ''}
            {peerMedia.muted && peerMedia.cameraOff ? ' · ' : ''}
            {peerMedia.cameraOff ? 'Peer camera off' : ''}
          </span>
        )}
        <button class='btn btn-outline btn-error btn-sm col-span-2 min-h-11 gap-2 sm:col-span-1 sm:ml-auto' type='button' onClick={endCall} disabled={!localStream && !remoteStream}>
          <Icon name='phone-off' size={18} />
          End call
        </button>
      </div>
      {calling && (
        <div class='alert flex items-center justify-between gap-3 text-sm' role='status'>
          <span>Calling {peerName}…</span>
          <button class='btn btn-ghost btn-sm' type='button' onClick={endCall}>Cancel</button>
        </div>
      )}
      <Modal open={incoming} onCancel={declineCall}>
        <div slot='headline'>{peerName}</div>
        <div slot='content' class='modal-body center'>
          <span class='ring'><Avatar id={peer?.id ?? secret} label={peerName} size='lg' /></span>
          <p class='eyebrow' id='call-desc'>Incoming {incomingVideo ? 'video' : 'voice'} call</p>
        </div>
        <div slot='actions' class='modal-actions'>
          <md-text-button onClick={declineCall}>Decline</md-text-button>
          {incomingVideo && <md-outlined-button onClick={() => startCall(false)}>Audio only</md-outlined-button>}
          <md-filled-button onClick={() => startCall(incomingVideo)}>Accept</md-filled-button>
        </div>
      </Modal>
      {callError && <div role='alert' class='alert alert-error text-sm'>{callError}</div>}

      <div class='msgs-wrap relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-base-300 bg-base-100'>
        <div class='flex max-h-[30dvh] gap-2 overflow-auto p-2 empty:hidden'>
          <video ref={remoteVideo} class='max-h-[26dvh] max-w-full rounded-xl bg-base-200 object-contain' autoPlay playsInline hidden={!remoteStream} />
          <video ref={localVideo} class='max-h-[26dvh] max-w-full rounded-xl bg-base-200 object-contain' autoPlay playsInline muted hidden={!localStream} />
        </div>
        <ul class='msgs msgs-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto p-3 sm:p-4' role='log' aria-live='polite' ref={msgsRef} onScroll={onScroll}>
          {msgs.length === 0 && (
            <li class='m-auto flex max-w-sm flex-col items-center gap-2 py-10 text-center text-base-content/60' aria-hidden='true'>
              <span class='grid size-12 place-items-center rounded-2xl bg-primary/10 text-2xl text-primary'>✳</span>
              <strong class='text-base font-semibold text-base-content'>Your conversation starts here</strong>
              <span class='text-sm'>Send a message to get things going.</span>
            </li>
          )}
          {msgs.map((m: Msg, i: number) => {
            const prev = i > 0 ? msgs[i - 1].at : null;
            const sep = dayLabel(m.at, prev);
            return (
              <Fragment key={m.id}>
                {sep && <li class='my-2 text-center text-xs text-base-content/60'>{sep}</li>}
                <li class={`${m.mine ? 'mine ml-auto rounded-br-md bg-primary text-primary-content' : 'theirs mr-auto rounded-bl-md bg-base-200 text-base-content'} msg max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 shadow-sm sm:max-w-[75%]`}>
                  <span>{m.text}</span>
                  <time class='msg-time block pt-1 text-right text-[0.65rem] opacity-70' dateTime={new Date(m.at).toISOString()}>
                    {new Date(m.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </time>
                </li>
              </Fragment>
            );
          })}
        </ul>
        {!atBottom && msgs.length > 0 && (
          <button class='btn btn-primary btn-sm absolute bottom-3 left-1/2 -translate-x-1/2 shadow-lg' type='button' aria-label='Jump to latest messages' onClick={jumpToLatest}>
            <Icon name='down' size={16} />
            Jump to latest
          </button>
        )}
      </div>

      <form class='composer grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-end gap-2 border-t border-base-300 pt-3' onSubmit={send}>
        <button class='btn btn-ghost btn-circle btn-sm mb-1' type='button' aria-label='Send a file' onClick={() => fileInputRef.current?.click()}>
          <Icon name='paperclip' />
        </button>
        <div class='min-w-0'>
          <textarea
            class='textarea textarea-bordered min-h-12 w-full resize-y rounded-2xl'
            aria-label='Message'
            rows={2}
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder='Type a message'
            onInput={onTextareaInput}
            onKeyDown={onKeyDown}
          />
          <p class='px-1 pt-1 text-right text-xs text-base-content/50' aria-hidden='true'>{draft.length} / {MAX_MESSAGE_LENGTH}</p>
        </div>
        <button class='btn btn-primary mb-1 min-h-11 gap-2' type='submit' aria-label='Send' disabled={!draft.trim() || peers === 0}>
          <Icon name='send' size={18} />
          <span class='hidden sm:inline'>Send</span>
        </button>
      </form>

      <input type='file' ref={fileInputRef} class='sr-only' aria-label='Send a file' onChange={onPickFile} disabled={peers === 0 || sendPct !== null} />
      {sendPct !== null && <md-linear-progress value={sendPct} max={100} aria-label='Upload progress' />}
      {fileError && <div role='alert' class='alert alert-error text-sm'>{fileError}</div>}
      {files.length > 0 && (
        <ul class='flex max-h-24 flex-col gap-2 overflow-auto rounded-xl bg-base-200 p-3 text-sm'>
          {files.map((f: ReceivedFile, i: number) => (
            <li class='flex min-w-0 items-center gap-2 break-words' key={i}>
              {f.verified ? (
                <a class='flex min-w-0 items-center gap-2 break-all font-medium text-primary underline' href={f.url} download={f.name}>
                  <Icon name='download' /> {f.name} ({kb(f.size)})
                </a>
              ) : (
                <span class='flex items-center gap-2 text-error'><Icon name='alert' /> {f.name} failed integrity check, discarded</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <details class='collapse collapse-arrow rounded-xl bg-base-200 text-sm'>
        <summary class='collapse-title min-h-10 py-2 font-medium'>Debug info</summary>
        <div class='collapse-content flex flex-col gap-2'>
          <button class='btn btn-ghost btn-sm self-start' type='button' onClick={() => navigator.clipboard.writeText(debug.join(NL))}>Copy debug</button>
          <pre id='debug' class='max-h-32 overflow-auto whitespace-pre-wrap break-words text-xs'>{debug.join(NL)}</pre>
        </div>
      </details>
    </section>
  );
}
