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
    <Modal open={!!current} onCancel={() => current && onDecline(current)}>
      {current && (
        <>
          <div slot='headline' id='req-title'>
            {name}
          </div>
          <div slot='content' class='modal-body center'>
            <span class='ring'>
              <Avatar id={current.req.peer.id} label={name} size='lg' />
            </span>
            <p class='eyebrow'>New request</p>
            <p class='muted mono'>{formatId(current.req.peer.id)}</p>
            <p class='muted' id='req-desc'>
              Wants to message or call you. They are not in your contacts.
              {inChat && ' Accepting will leave your current chat.'}
            </p>
            {waiting > 0 && (
              <p class='muted'>
                {waiting} more {waiting === 1 ? 'request' : 'requests'} waiting
              </p>
            )}
          </div>
          <div slot='actions' class='modal-actions stacked'>
            <md-filled-button onClick={() => onAccept(current, true)}>
              Accept and save contact
            </md-filled-button>
            <md-outlined-button onClick={() => onAccept(current, false)}>
              Accept once
            </md-outlined-button>
            <div class='row split'>
              <md-text-button onClick={() => onDecline(current)}>
                Decline
              </md-text-button>
              <md-text-button class='btn-danger' onClick={() => onBlock(current)}>
                Block
              </md-text-button>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}
