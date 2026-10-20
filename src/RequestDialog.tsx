import { formatId } from './identity';
import type { Pending } from './pages';
import { Avatar, Modal, useRingtone } from './ui';

interface RequestDialogProps {
  requests: Pending[];
  inChat: boolean;
  onAccept: (p: Pending, save: boolean) => void;
  onDecline: (p: Pending) => void;
  onBlock: (p: Pending) => void;
}

export function RequestDialog({ requests, inChat, onAccept, onDecline, onBlock }: RequestDialogProps) {
  const current = requests[0];
  const waiting = requests.length - 1;
  useRingtone(!!current);
  const name = current?.req.peer.name || 'Someone';

  return (
    <Modal
      open={!!current}
      labelId='req-title'
      descId='req-desc'
      onCancel={() => current && onDecline(current)}
    >
      {current && (
        <div class='modal-body center'>
          <span class='ring'>
            <Avatar id={current.req.peer.id} label={name} size='lg' />
          </span>
          <p class='eyebrow'>New request</p>
          <h2 id='req-title'>{name}</h2>
          <p class='muted mono'>{formatId(current.req.peer.id)}</p>
          <p class='muted' id='req-desc'>
            Wants to message or call you. They are not in your contacts.
            {inChat && ' Accepting will leave your current chat.'}
          </p>
          <div class='modal-actions stacked'>
            <button onClick={() => onAccept(current, true)} autoFocus>
              Accept and save contact
            </button>
            <button class='ghost' onClick={() => onAccept(current, false)}>
              Accept once
            </button>
            <div class='row split'>
              <button class='ghost' onClick={() => onDecline(current)}>
                Decline
              </button>
              <button class='danger' onClick={() => onBlock(current)}>
                Block
              </button>
            </div>
          </div>
          {waiting > 0 && (
            <p class='muted'>
              {waiting} more {waiting === 1 ? 'request' : 'requests'} waiting
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
