import { Fragment } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Peer } from './inbox';
import { openSession, type PeerMediaState, type ReceivedFile, type Session } from './room';
import { HAS_TURN, MAX_MESSAGE_LENGTH } from './config';
import { Avatar, Icon, Modal, submitForm, useRingtone } from './ui';

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
    <div class='chat'>
      <header class='chat-head'>
        <md-icon-button class='chat-back' aria-label='Back to chats' onClick={onLeave}>
          <Icon name='back' size={20} />
        </md-icon-button>
        <Avatar id={peer?.id ?? secret} label={peer?.name || 'Private room'} />
        <div class='grow'>
          <strong>{peer?.name || 'Private room'}</strong>
          <span class={peers === 1 ? 'pill on' : 'pill'} role='status'>
            {peers === 0 && 'Waiting…'}
            {peers === 1 && 'Connected'}
            {peers > 1 && 'Room full'}
          </span>
        </div>
        {peer && !saved && (
          <md-outlined-button onClick={onSave}>
            Save contact
          </md-outlined-button>
        )}
      </header>

      {!peer && (
        <p class='invite'>
          <md-filled-button onClick={copyLink}>{copied ? 'Link copied' : 'Copy invite link'}</md-filled-button>
          <span class='muted'>Send this link to the other person.</span>
        </p>
      )}
      {relayOnly && HAS_TURN && <p class='muted'>Relay-only mode is on: traffic goes through the TURN relay.</p>}
      {relayOnly && !HAS_TURN && (
        <p class='muted'>Relay-only mode is ignored because no TURN server is configured.</p>
      )}
      {slow && peers === 0 && (
        <p class='muted' role='status'>
          {HAS_TURN
            ? 'Still connecting. Make sure the other person has the same link open.'
            : 'Still connecting. If you are on different networks (e.g. mobile data), a direct connection may be blocked and a TURN relay is needed.'}
        </p>
      )}

      <div class='call-bar'>
        <md-filled-tonal-button onClick={() => startCall(false)} disabled={peers === 0 || !!localStream}>
          <Icon name='phone' size={18} slot='icon' />
          Voice call
        </md-filled-tonal-button>
        <md-filled-tonal-button onClick={() => startCall(true)} disabled={peers === 0 || !!localStream}>
          <Icon name='video' size={18} slot='icon' />
          Video call
        </md-filled-tonal-button>
        <md-icon-button
          class='call-tool'
          disabled={!localStream}
          aria-pressed={muted}
          aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
          onClick={toggleMute}
        >
          <Icon name={muted ? 'mic-off' : 'mic'} />
        </md-icon-button>
        <md-icon-button
          class='call-tool'
          disabled={!localStream}
          aria-pressed={cameraOff}
          aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
          onClick={toggleCamera}
        >
          <Icon name={cameraOff ? 'video-off' : 'video'} />
        </md-icon-button>
        {localStream && <span class='call-timer'>{formatTimer(now - (callStart ?? now))}</span>}
        {(peerMedia.muted || peerMedia.cameraOff) && (
          <span class='peer-media'>
            {peerMedia.muted ? 'Peer muted' : ''}
            {peerMedia.muted && peerMedia.cameraOff ? ' ' : ''}
            {peerMedia.cameraOff ? 'Peer camera off' : ''}
          </span>
        )}
        <md-outlined-button class='call-end' onClick={endCall} disabled={!localStream && !remoteStream}>
          <Icon name='phone-off' size={18} slot='icon' />
          End call
        </md-outlined-button>
      </div>
      {calling && (
        <p class='banner' role='status'>
          <span>Calling {peerName}…</span>
          <md-text-button onClick={endCall}>Cancel</md-text-button>
        </p>
      )}
      <Modal open={incoming} onCancel={declineCall}>
        <div slot='headline'>{peerName}</div>
        <div slot='content' class='modal-body center'>
          <span class='ring'>
            <Avatar id={peer?.id ?? secret} label={peerName} size='lg' />
          </span>
          <p class='eyebrow' id='call-desc'>
            Incoming {incomingVideo ? 'video' : 'voice'} call
          </p>
        </div>
        <div slot='actions' class='modal-actions'>
          <md-text-button onClick={declineCall}>Decline</md-text-button>
          {incomingVideo && (
            <md-outlined-button onClick={() => startCall(false)}>
              Audio only
            </md-outlined-button>
          )}
          <md-filled-button onClick={() => startCall(incomingVideo)}>Accept</md-filled-button>
        </div>
      </Modal>
      {callError && (
        <p role='alert' class='error'>
          {callError}
        </p>
      )}
      <div class='videos'>
        <video ref={remoteVideo} autoPlay playsInline hidden={!remoteStream} />
        <video ref={localVideo} class='self' autoPlay playsInline muted hidden={!localStream} />
      </div>

      <div class='msgs-wrap'>
        <ul class='msgs msgs-scroll' role='log' aria-live='polite' ref={msgsRef} onScroll={onScroll}>
          {msgs.length === 0 && (
            <li class='empty-state' aria-hidden='true'>
              <span class='empty-state-mark'>✳</span>
              <strong>Your conversation starts here</strong>
              <span>Send a message to get things going.</span>
            </li>
          )}
          {msgs.map((m: Msg, i: number) => {
            const prev = i > 0 ? msgs[i - 1].at : null;
            const sep = dayLabel(m.at, prev);
            return (
              <Fragment key={m.id}>
                {sep && <li class='msg-day'>{sep}</li>}
                <li class={`${m.mine ? 'mine' : 'theirs'} msg`}>
                  {m.text}
                  <time class='msg-time' dateTime={new Date(m.at).toISOString()}>
                    {new Date(m.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </time>
                </li>
              </Fragment>
            );
          })}
        </ul>
        {!atBottom && msgs.length > 0 && (
          <md-filled-tonal-button class='jump-latest' aria-label='Jump to latest messages' onClick={jumpToLatest}>
            <Icon name='down' size={16} slot='icon' />
            Jump to latest
          </md-filled-tonal-button>
        )}
      </div>
      <form
        class='composer'
        onSubmit={send}
      >
        <div class='composer-tools'>
          <md-icon-button
            class='composer-attach'
            aria-label='Send a file'
            onClick={() => fileInputRef.current?.click()}
          >
            <Icon name='paperclip' />
          </md-icon-button>
        </div>
        <div class='composer-field'>
          <md-outlined-text-field
            type='textarea'
            label='Message'
            aria-label='Message'
            rows={2}
            value={draft}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder='Type a message'
            onInput={onTextareaInput}
            onKeyDown={onKeyDown}
          />
        </div>
        <md-filled-button class='composer-send' onClick={submitForm}>
          Send
        </md-filled-button>
        <span class='composer-count' aria-hidden='true'>
          {draft.length} / {MAX_MESSAGE_LENGTH}
        </span>
      </form>

      <p class='file-transfer'>
        <input type='file' ref={fileInputRef} class='visually-hidden' aria-label='Send a file' onChange={onPickFile} disabled={peers === 0 || sendPct !== null} />
      </p>
      {sendPct !== null && <md-linear-progress value={sendPct} max={100} aria-label='Upload progress' />}
      {fileError && (
        <p role='alert' class='error'>
          {fileError}
        </p>
      )}
      {files.length > 0 && (
        <ul class='files'>
          {files.map((f: ReceivedFile, i: number) => (
            <li class={`file-item${f.verified ? '' : ' file-item-failed'}`} key={i}>
              {f.verified ? (
                <a href={f.url} download={f.name}>
                  <Icon name='download' /> {f.name} ({kb(f.size)})
                </a>
              ) : (
                <>
                  <Icon name='alert' /> {f.name} failed integrity check, discarded
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <details class='debug'>
        <summary>Debug info</summary>
        <md-text-button onClick={() => navigator.clipboard.writeText(debug.join(NL))}>
          Copy debug
        </md-text-button>
        <pre id='debug'>{debug.join(NL)}</pre>
      </details>
    </div>
  );
}
