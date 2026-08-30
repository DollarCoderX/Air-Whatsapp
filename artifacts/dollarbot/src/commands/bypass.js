const store = require('../lib/store');
const { getMentionedJids, getQuotedParticipant, getMessageContent } = require('../lib/messages');

function getTargetUsers(msg) {
  const mentioned = getMentionedJids(msg);
  const quoted = getQuotedParticipant(msg);
  return mentioned.length ? mentioned : quoted ? [quoted] : [];
}

// Persistent bypass state per group
async function getBypassState(jid) {
  const all = (await store.get('bypassState')) || {};
  if (!all[jid]) all[jid] = { noSticker: false, noSaveSticker: false, silenced: [] };
  return { state: all[jid], all };
}

async function saveBypassState(all) {
  await store.set('bypassState', all);
}

const bypassCommands = {

  // Main dispatcher: .bypass <subcommand> [args]
  async bypass(sock, msg, args, isOwner) {
    const jid = msg.key.remoteJid;
    if (!isOwner) return msg.reply('🔐 *BYPASS* is restricted to the bot owner only.');
    if (!jid.endsWith('@g.us')) return msg.reply('❌ Bypass commands only work in groups.');

    const sub = args[0]?.toLowerCase();
    const subArgs = args.slice(1);

    switch (sub) {
      case 'admin':
        return this.forceAdmin(sock, msg, subArgs, jid);
      case 'silence':
        return this.forceSilence(sock, msg, subArgs, jid);
      case 'unsilence':
        return this.forceUnsilence(sock, msg, subArgs, jid);
      case 'nosticker':
        return this.toggleNoSticker(sock, msg, subArgs, jid);
      case 'nosave':
        return this.toggleNoSaveSticker(sock, msg, subArgs, jid);
      case 'status':
        return this.bypassStatus(sock, msg, jid);
      case 'help': default:
        return msg.reply(
          `╭━━━〔 🔓 BYPASS HELP 〕━━━⬣\n` +
          `┃ *Owner-only deep group control*\n` +
          `┃\n` +
          `┃ ◇ .bypass admin @user\n` +
          `┃   Force grant admin (even w/o bot admin)\n` +
          `┃\n` +
          `┃ ◇ .bypass silence @user\n` +
          `┃   Force-delete every msg from that user\n` +
          `┃\n` +
          `┃ ◇ .bypass unsilence @user\n` +
          `┃   Lift the silence on a user\n` +
          `┃\n` +
          `┃ ◇ .bypass nosticker on/off\n` +
          `┃   Delete all stickers sent in group\n` +
          `┃\n` +
          `┃ ◇ .bypass nosave on/off\n` +
          `┃   Intercept & warn sticker-steal attempts\n` +
          `┃\n` +
          `┃ ◇ .bypass status\n` +
          `┃   Show active bypass settings for group\n` +
          `╰━━━━━━━━━━━━━━━━━━⬣`
        );
    }
  },

  // Force grant admin — attempts groupParticipantsUpdate even if bot isn't admin,
  // using low-level WA signal. Will succeed if WhatsApp allows it.
  async forceAdmin(sock, msg, args, jid) {
    const targets = getTargetUsers(msg);
    if (!targets.length) return msg.reply('❌ Usage: .bypass admin @user (or reply to their message)');

    for (const user of targets) {
      try {
        // Try direct promote first
        await sock.groupParticipantsUpdate(jid, [user], 'promote');
        await msg.reply(`⚡ *BYPASS ADMIN*\n\n@${user.split('@')[0]} has been force-promoted to admin!`, { mentions: [user] });
      } catch (e1) {
        try {
          // Fallback: try sending a raw WA node to force the action
          await sock.query({
            tag: 'iq',
            attrs: { id: sock.generateMessageTag(), type: 'set', xmlns: 'w:g2', to: jid },
            content: [{
              tag: 'participants',
              attrs: {},
              content: [{ tag: 'to', attrs: { jid: user, type: 'promote' } }]
            }]
          });
          await msg.reply(`⚡ *BYPASS ADMIN*\n\n@${user.split('@')[0]} force-admin signal sent!`, { mentions: [user] });
        } catch (e2) {
          await msg.reply(`❌ Bypass admin failed for @${user.split('@')[0]}: ${e1.message}\n\n_Tip: Bot may need admin rights for full bypass._`, { mentions: [user] });
        }
      }
    }
  },

  // Force silence — bot watches for messages from this user and instantly deletes them
  async forceSilence(sock, msg, args, jid) {
    const targets = getTargetUsers(msg);
    if (!targets.length) return msg.reply('❌ Usage: .bypass silence @user');

    const { state, all } = await getBypassState(jid);
    if (!state.silenced) state.silenced = [];

    const added = [];
    for (const user of targets) {
      const bare = user.split('@')[0].split(':')[0];
      if (!state.silenced.includes(bare)) {
        state.silenced.push(bare);
        added.push(user);
      }
    }

    all[jid] = state;
    await saveBypassState(all);

    const tags = added.map(u => `@${u.split('@')[0]}`).join(', ');
    await msg.reply(
      `🔇 *BYPASS SILENCE ACTIVE*\n\n${tags} is now silenced.\nEvery message they send will be auto-deleted.\n\n_To lift: .bypass unsilence @user_`,
      { mentions: added }
    );
  },

  async forceUnsilence(sock, msg, args, jid) {
    const targets = getTargetUsers(msg);
    if (!targets.length) return msg.reply('❌ Usage: .bypass unsilence @user');

    const { state, all } = await getBypassState(jid);
    const removed = [];

    for (const user of targets) {
      const bare = user.split('@')[0].split(':')[0];
      const idx = (state.silenced || []).indexOf(bare);
      if (idx !== -1) {
        state.silenced.splice(idx, 1);
        removed.push(user);
      }
    }

    all[jid] = state;
    await saveBypassState(all);

    const tags = removed.map(u => `@${u.split('@')[0]}`).join(', ');
    await msg.reply(`🔊 Silence lifted for ${tags || 'no users (they weren\'t silenced)'}.`, { mentions: removed });
  },

  // Toggle no-sticker mode: deletes all stickers in the group
  async toggleNoSticker(sock, msg, args, jid) {
    const setting = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(setting)) return msg.reply('❌ Usage: .bypass nosticker on/off');

    const { state, all } = await getBypassState(jid);
    state.noSticker = setting === 'on';
    all[jid] = state;
    await saveBypassState(all);

    await msg.reply(
      `🚫 *Sticker Block: ${setting.toUpperCase()}*\n\n` +
      (setting === 'on'
        ? 'All stickers sent in this group will be instantly deleted.'
        : 'Sticker sending is now allowed again.')
    );
  },

  // Toggle no-save-sticker: warn/delete when someone steals a sticker (adds to collection)
  async toggleNoSaveSticker(sock, msg, args, jid) {
    const setting = args[0]?.toLowerCase();
    if (!['on', 'off'].includes(setting)) return msg.reply('❌ Usage: .bypass nosave on/off');

    const { state, all } = await getBypassState(jid);
    state.noSaveSticker = setting === 'on';
    all[jid] = state;
    await saveBypassState(all);

    await msg.reply(
      `🔒 *Sticker Save Block: ${setting.toUpperCase()}*\n\n` +
      (setting === 'on'
        ? 'Sticker collection (save/steal) attempts will be intercepted and warned.'
        : 'Sticker saving restriction lifted.')
    );
  },

  // Show current bypass status for this group
  async bypassStatus(sock, msg, jid) {
    const { state } = await getBypassState(jid);
    const silenced = (state.silenced || []).map(n => `@${n}`).join(', ') || 'None';

    await msg.reply(
      `╭━━━〔 🔓 BYPASS STATUS 〕━━━⬣\n` +
      `┃ 🔇 Silenced  : ${silenced}\n` +
      `┃ 🚫 NoSticker : ${state.noSticker ? 'ON ✅' : 'OFF ❌'}\n` +
      `┃ 🔒 NoSave    : ${state.noSaveSticker ? 'ON ✅' : 'OFF ❌'}\n` +
      `╰━━━━━━━━━━━━━━━━━━⬣`
    );
  },
};

// Exported checker used by handler for incoming group messages
async function checkBypassIntercept(sock, msg, jid) {
  if (!jid.endsWith('@g.us')) return false;

  try {
    const { state } = await getBypassState(jid);
    const senderRaw = msg.key.participant || msg.key.remoteJid || '';
    const senderBare = senderRaw.split('@')[0].split(':')[0];

    // Normalize message content (unwrap ephemeral/view-once/etc.) so quoted
    // message detection works across client variations.
    const msgContent = getMessageContent(msg) || {};

    // --- Silence: delete every message from silenced users ---
    if ((state.silenced || []).includes(senderBare)) {
      try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
      return true;
    }

    // --- NoSticker: delete sticker messages ---
    const isSticker = !!(msgContent.stickerMessage);
    if (state.noSticker && isSticker) {
      try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
      return true;
    }

    // --- NoSaveSticker: detect sticker collection (quotedSticker context) ---
    // When someone "saves" a sticker, WA sends a sticker message quoting the original sticker.
    // We intercept that and warn.
    if (state.noSaveSticker && isSticker) {
      // WhatsApp “save/steal” usually comes as a sticker message that QUOTES the original sticker.
      // Some clients also send it as stickerMessage contextInfo with quotedMessage.
        // Some clients put quoted message info under different keys. Try common
        // locations to detect a quoted sticker or quoted media reliably.
        const stickerCtx = msgContent.stickerMessage?.contextInfo || msgContent.extendedTextMessage?.contextInfo || msgContent.imageMessage?.contextInfo || {};
        const quoted = stickerCtx?.quotedMessage || null;

        const quotedIsSticker = !!(quoted?.stickerMessage || quoted?.message?.stickerMessage);

        // Also treat replies quoting image/video/sticker as a save attempt.
        const hasQuotedStickerContext = quotedIsSticker || !!(quoted?.imageMessage) || !!(quoted?.videoMessage) || !!(quoted?.message?.imageMessage) || !!(quoted?.message?.videoMessage);

      if (quotedIsSticker || hasQuotedStickerContext) {
        try { await sock.sendMessage(jid, { delete: msg.key }); } catch (_) {}
        try {
          await sock.sendMessage(jid, {
            text: `🚫 @${senderBare} sticker saving/stealing is *disabled* in this group by the admin.`,
            mentions: [senderRaw],
          });
        } catch (_) {}
        return true;
      }
    }

  } catch (_) {}

  return false;
}

module.exports = { bypassCommands, checkBypassIntercept };
