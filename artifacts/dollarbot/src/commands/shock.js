'use strict';
const pollinations = require('../lib/pollinations');

function getSender(msg) {
  return msg?.key?.participant || msg?.key?.remoteJid || '';
}
function getMentioned(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    msg.message?.imageMessage?.contextInfo?.mentionedJid || []
  );
}
function getQuotedJid(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo?.participant ||
    msg.message?.imageMessage?.contextInfo?.participant || null
  );
}
function resolveTarget(msg, args) {
  const q = getQuotedJid(msg);
  if (q) return q;
  const m = getMentioned(msg);
  if (m.length) return m[0];
  if (args[0]) {
    const d = args[0].replace(/[^0-9]/g, '');
    if (d.length >= 7) return d + '@s.whatsapp.net';
  }
  return getSender(msg);
}
function name(jid) { return jid?.split('@')[0]?.split(':')[0] || 'you'; }
async function ai(prompt, fallback = '...') {
  try { return (await pollinations.textGenerate([{ role: 'user', content: prompt }])) || fallback; }
  catch { return fallback; }
}

const shockCommands = {

  // .aura — mystical aura reading
  async aura(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ') || name(target);
    await sock.sendMessage(jid, { text: `🔮 _Scanning ${n}'s aura frequencies..._` }, { quoted: msg });
    const colors = ['Crimson Red','Midnight Blue','Violet Purple','Golden Yellow','Emerald Green',
      'Electric White','Shadow Black','Rose Pink','Cosmic Silver','Neon Orange'];
    const intensities = ['🔥 Blazing','✨ Radiant','💫 Shimmering','⚡ Electrifying','🌟 Legendary',
      '🌀 Swirling','🌌 Cosmic','💎 Crystalline'];
    let h = 0;
    const s = n.toLowerCase();
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const color = colors[h % colors.length];
    const intensity = intensities[(h >> 2) % intensities.length];
    const pct = (h % 60) + 40;
    const reading = await ai(
      `Give a dramatic, mystical 2-sentence aura reading for someone named "${n}" whose aura is ${color}. Be specific, creative, and make it feel real. No hashtags.`
    );
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🔮 AURA SCANNER 〕━━━⬣\n` +
        `┃\n` +
        `┃ 👤 *Subject:* ${n}\n` +
        `┃ 🎨 *Aura Color:* ${color}\n` +
        `┃ ⚡ *Intensity:* ${intensity}\n` +
        `┃ 💫 *Energy Level:* ${pct}%\n` +
        `┃\n` +
        `┃ 📜 *Reading:*\n` +
        `┃ ${reading.replace(/\n/g, '\n┃ ')}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `_⚡ Air Bot V6 — Aura Intelligence_`,
    }, { quoted: msg });
  },

  // .battle @user1 @user2 — AI rap battle
  async battle(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const mentions = getMentioned(msg);
    const quoted = getQuotedJid(msg);
    let p1, p2;
    if (mentions.length >= 2) {
      p1 = name(mentions[0]); p2 = name(mentions[1]);
    } else if (mentions.length === 1 && quoted) {
      p1 = name(quoted); p2 = name(mentions[0]);
    } else if (args.length >= 2) {
      const mid = Math.floor(args.length / 2);
      p1 = args.slice(0, mid).join(' ');
      p2 = args.slice(mid).join(' ');
    } else {
      return sock.sendMessage(jid, { text: '❌ Usage: .battle @user1 @user2' }, { quoted: msg });
    }
    await sock.sendMessage(jid, { text: `🎤 _Generating rap battle between ${p1} vs ${p2}..._` }, { quoted: msg });
    const result = await ai(
      `Write a short 3-round WhatsApp rap battle between ${p1} and ${p2}. Each round has 2 punchy bars per person. Make it funny, savage, and use their names cleverly. Format as:\n🎤 Round 1:\n${p1}: [bars]\n${p2}: [bars]\n🎤 Round 2:\n...\n🎤 WINNER: [name] 👑\nKeep it under 20 lines total.`
    );
    await sock.sendMessage(jid, {
      text: `🎤 *RAP BATTLE* 🎤\n*${p1}* vs *${p2}*\n\n${result}\n\n_⚡ Air Bot V6 — Battle Arena_`,
    }, { quoted: msg });
  },

  // .deeproast @user — paragraph-level savage roast
  async deeproast(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    await sock.sendMessage(jid, { text: `🔥 _Loading nuclear roast for ${n}..._` }, { quoted: msg });
    const result = await ai(
      `Write a deeply savage, multi-point roast of a person named "${n}". Include 4 brutal but funny observations covering their personality, life choices, future, and general vibe. Each point should be a separate paragraph. Make it WhatsApp-friendly, no hashtags. End with a one-liner kill shot.`
    );
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🔥 DEEP ROAST 〕━━━⬣\n` +
        `┃ Target: *${n}*\n` +
        `┃━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `┃\n${result}\n┃\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `_⚡ Air Bot V6 — Roast Intelligence_`,
    }, { quoted: msg });
  },

  // .spy @user — fake intelligence report
  async spy(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    await sock.sendMessage(jid, { text: `🕵️ _Accessing classified files on ${n}..._\n_[DECRYPTING]_` }, { quoted: msg });
    const activities = ['Watched 6 reels before replying to important messages',
      'Left 3 people on read today', 'Googled their ex at 2 AM',
      'Spent 40 minutes choosing a WhatsApp status', 'Texted someone "coming" then didn\'t come',
      'Pretended to sleep during an important call'];
    const secrets = ['Still knows their ex\'s schedule by heart',
      'Texts back fast but always says "I was busy"', 'Has a folder of screenshots they\'ll never use',
      'Cries during animated movies', 'Googles symptoms at 3 AM every week'];
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    const a1 = activities[h % activities.length];
    const a2 = activities[(h + 2) % activities.length];
    const sec = secrets[h % secrets.length];
    const threat = ['🟢 LOW', '🟡 MEDIUM', '🔴 HIGH'][(h >> 3) % 3];
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🕵️ INTEL REPORT 〕━━━⬣\n` +
        `┃\n` +
        `┃ 🆔 *Subject:* ${n}\n` +
        `┃ 📁 *File Status:* CLASSIFIED\n` +
        `┃ ⚠️  *Threat Level:* ${threat}\n` +
        `┃\n` +
        `┃ 📋 *Recent Activities:*\n` +
        `┃ • ${a1}\n` +
        `┃ • ${a2}\n` +
        `┃\n` +
        `┃ 🔓 *Leaked Intel:*\n` +
        `┃ ${sec}\n` +
        `┃\n` +
        `┃ 🖊️ *Agent Notes:* Highly suspicious behavior detected.\n` +
        `┃ Further monitoring recommended.\n` +
        `┃\n` +
        `┃ _This message will self-destruct in 60s_ 💣\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .couple @user1 @user2 — compatibility
  async couple(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const mentions = getMentioned(msg);
    const quoted = getQuotedJid(msg);
    let p1 = name(getSender(msg)), p2;
    if (mentions.length >= 2) {
      p1 = name(mentions[0]); p2 = name(mentions[1]);
    } else if (mentions.length === 1) {
      p2 = name(mentions[0]);
    } else if (quoted) {
      p2 = name(quoted);
    } else if (args.length >= 1) {
      p2 = args.join(' ');
    } else {
      return sock.sendMessage(jid, { text: '❌ Usage: .couple @user1 @user2' }, { quoted: msg });
    }
    let h = 0;
    const s = (p1 + p2).toLowerCase();
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const pct = (h % 70) + 25;
    const vibes = ['🔥 On fire','💞 Sweethearts','⚡ Electric','🌊 Deep connection','💫 Soulmates',
      '🤝 Best buddies','😅 Complicated','💥 Explosive','🌸 Adorable','👑 Power couple'];
    const vibe = vibes[h % vibes.length];
    const shipName = p1.slice(0, Math.ceil(p1.length / 2)) + p2.slice(Math.floor(p2.length / 2));
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💕 COUPLE SCANNER 〕━━━⬣\n` +
        `┃\n` +
        `┃ 💫 *${p1}* + *${p2}*\n` +
        `┃ 🏷️ *Ship Name:* ${shipName}\n` +
        `┃\n` +
        `┃ 💘 *Compatibility:* ${pct}%\n` +
        `┃ [${'❤️'.repeat(Math.round(pct/10))}${'🖤'.repeat(10 - Math.round(pct/10))}]\n` +
        `┃\n` +
        `┃ ✨ *Vibe:* ${vibe}\n` +
        `┃ ${pct >= 80 ? '😍 Absolutely perfect for each other!' : pct >= 60 ? '💕 Great match with potential!' : pct >= 40 ? '🤔 Could work with effort...' : '😬 Might be a wild ride!'}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .powerup @user — power level scanner
  async powerup(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    const lvl = ((h % 9000) + 1000);
    const rank = lvl >= 9000 ? 'LEGENDARY ⚡' : lvl >= 7000 ? 'ELITE 💎' :
      lvl >= 5000 ? 'ADVANCED 🔥' : lvl >= 3000 ? 'SKILLED ⚔️' : 'ROOKIE 🌱';
    const abilities = [
      ['Mind Control','Shadow Step','Time Warp'],
      ['Fire Burst','Telepathy','Speed Surge'],
      ['Iron Fist','Invisibility','Lightning Strike'],
      ['Healing Touch','Gravity Pull','Sonic Scream'],
      ['Ice Form','Dark Aura','Energy Shield'],
    ];
    const ab = abilities[h % abilities.length];
    const bar = '▓'.repeat(Math.min(10, Math.round(lvl/1000))) + '░'.repeat(Math.max(0, 10 - Math.round(lvl/1000)));
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 ⚡ POWER SCANNER 〕━━━⬣\n` +
        `┃\n` +
        `┃ 👤 *Subject:* ${n}\n` +
        `┃ ⚡ *Power Level:* ${lvl.toLocaleString()}\n` +
        `┃ [${bar}]\n` +
        `┃ 🏆 *Rank:* ${rank}\n` +
        `┃\n` +
        `┃ 🦾 *Special Abilities:*\n` +
        `┃ • ${ab[0]}\n` +
        `┃ • ${ab[1]}\n` +
        `┃ • ${ab[2]}\n` +
        `┃\n` +
        `┃ ${lvl >= 9000 ? '🌟 *ITS OVER 9000!!!* 🌟' : '📈 Keep training to unlock more power!'}\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .bomb @user — rapid-fire messages
  async bomb(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    await sock.sendMessage(jid, { text: `💣 _Loading bomb for ${n}..._` }, { quoted: msg });
    const bombs = await ai(
      `Generate 5 short, savage, funny one-liner roasts for someone named "${n}". Number them 1-5. Each on its own line. Max 15 words each. No hashtags.`
    );
    const lines = bombs.split('\n').filter(l => l.trim()).slice(0, 5);
    for (const line of lines) {
      await sock.sendMessage(jid, { text: `💣 ${line}` });
      await new Promise(r => setTimeout(r, 800));
    }
    await sock.sendMessage(jid, { text: `💥 *BOOM!* ${n} has been obliterated! 💀` });
  },

  // .stalk @user — fake profile intelligence scan
  async stalk(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    await sock.sendMessage(jid, { text: `🔎 _Running deep scan on ${n}...\n[ACCESSING PROFILE DATA]\n[ANALYZING BEHAVIOR PATTERNS]_` }, { quoted: msg });
    await new Promise(r => setTimeout(r, 2000));
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    const onlineTimes = ['Mostly online 11 PM – 3 AM 🌙', 'Active 7-9 AM and 10 PM+ 📱',
      'Peak activity: lunch & late night 🍽️', 'Online all day, always "busy" 😅'];
    const habits = ['Reads messages but doesn\'t reply for hours',
      'Sends voice notes instead of typing', 'Goes offline when someone asks a favour',
      'Types "..." then deletes and sends nothing', 'Screenshot collector 📸'];
    const vibes = ['Main character energy', 'Chaotic neutral', 'Overthinker supreme',
      'Social butterfly with antisocial tendencies', 'Professional ghost'];
    const onlineT = onlineTimes[h % onlineTimes.length];
    const habit = habits[(h >> 2) % habits.length];
    const vibe = vibes[(h >> 4) % vibes.length];
    const msgCount = ((h % 500) + 50).toLocaleString();
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🔎 DEEP SCAN COMPLETE 〕━━━⬣\n` +
        `┃\n` +
        `┃ 🆔 *Target:* ${n}\n` +
        `┃ 📊 *Profile Score:* ${(h % 40) + 60}/100\n` +
        `┃\n` +
        `┃ 📱 *Online Pattern:*\n` +
        `┃ ${onlineT}\n` +
        `┃\n` +
        `┃ 🧠 *Behavior Analysis:*\n` +
        `┃ ${habit}\n` +
        `┃\n` +
        `┃ ✨ *Vibe Check:* ${vibe}\n` +
        `┃ 💬 *Est. Messages Sent:* ${msgCount}+\n` +
        `┃ 📸 *Screenshot Probability:* ${(h % 60) + 30}%\n` +
        `┃\n` +
        `┃ ⚠️  _For entertainment only_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .astrology @user — full astrology reading
  async astrology(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    await sock.sendMessage(jid, { text: `🌙 _Reading the stars for ${n}..._` }, { quoted: msg });
    const signs = ['♈ Aries','♉ Taurus','♊ Gemini','♋ Cancer','♌ Leo','♍ Virgo',
      '♎ Libra','♏ Scorpio','♐ Sagittarius','♑ Capricorn','♒ Aquarius','♓ Pisces'];
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    const sign = signs[h % signs.length];
    const reading = await ai(
      `Give a fun and dramatic astrology reading for someone named "${n}" who is a ${sign}. Cover their personality, love life, career, and a prediction for the week. Keep it punchy and WhatsApp-friendly. No hashtags.`
    );
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 ⭐ ASTROLOGY READING 〕━━━⬣\n` +
        `┃\n` +
        `┃ 👤 *${n}*\n` +
        `┃ 🌙 *Sign:* ${sign}\n` +
        `┃\n` +
        `${reading.replace(/^/gm, '┃ ')}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .lastwords @user — dramatic last words
  async lastwords(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    const result = await ai(
      `Write 3 hilarious and dramatic "last words" that someone named "${n}" would say before dying. Make each one reflect a different aspect of their personality. Number them 1-3. Keep it funny and punchy.`
    );
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 💀 LAST WORDS 〕━━━⬣\n` +
        `┃ *${n}'s Final Words:*\n` +
        `┃\n` +
        `${result.replace(/^/gm, '┃ ')}\n` +
        `┃\n` +
        `┃ _Rest In Peace... or not 😂_\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .obituary @user — funny obituary
  async obituary(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    await sock.sendMessage(jid, { text: `📰 _Writing obituary for ${n}..._` }, { quoted: msg });
    const result = await ai(
      `Write a short, funny, satirical obituary for a fictional character named "${n}". Include: how they "died" (something ridiculous), what they'll be remembered for, and a funny eulogy quote. Keep it 5-7 lines. WhatsApp-friendly. No hashtags.`
    );
    await sock.sendMessage(jid, {
      text: `📰 *In Memoriam: ${n}*\n\n${result}\n\n_⚡ Air V6 — Memorial Services_`,
    }, { quoted: msg });
  },

  // .hype @user — AI hype speech
  async hype(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    const result = await ai(
      `Write an over-the-top, energetic hype speech for "${n}" as if they're about to do something epic. Make it motivational, dramatic, and funny. 6-8 lines. WhatsApp-friendly. Use bold statements. No hashtags.`
    );
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🔥 HYPE SPEECH 〕━━━⬣\n` +
        `┃ For: *${n}*\n` +
        `┃\n` +
        `${result.replace(/^/gm, '┃ ')}\n` +
        `┃\n` +
        `┃ 🌟 *GO GET IT!* 🚀\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .verdict @user — dramatic verdict
  async verdict(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    const verdicts = ['GUILTY of being too extra 💅','INNOCENT but highly suspicious 🕵️',
      'CONVICTED of main character syndrome 🎬','CLEARED but placed on watchlist 👀',
      'SENTENCED to self-reflection 🪞','ACQUITTED due to pure chaos energy 🌀',
      'GUILTY of being genuinely iconic 👑','CONVICTED of making things unnecessarily dramatic 🎭'];
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    const v = verdicts[h % verdicts.length];
    const sentence = await ai(
      `Write a dramatic 2-sentence "court verdict" for "${n}". Be creative, specific, and funny. Reference their personality quirks. No hashtags.`
    );
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 ⚖️ COURT OF Air BOT 〕━━━⬣\n` +
        `┃\n` +
        `┃ 👤 *Defendant:* ${n}\n` +
        `┃ ⚖️ *Verdict:* ${v}\n` +
        `┃\n` +
        `┃ 📜 *Judge's Statement:*\n` +
        `┃ ${sentence.replace(/\n/g, '\n┃ ')}\n` +
        `┃\n` +
        `┃ 🔨 *CASE CLOSED* 🔨\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣`,
    }, { quoted: msg });
  },

  // .fakeid @user — fake profile card
  async fakeid(sock, msg, args) {
    const jid = msg.key.remoteJid;
    const target = resolveTarget(msg, args);
    const n = args.join(' ').replace(/@\w+/g, '').trim() || name(target);
    let h = 0;
    for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0;
    const titles = ['Chief Vibe Officer','Professional Overthinker','Certified Snack','Head of Chaos',
      'Senior Procrastinator','Director of Bad Decisions','Grand Master of Excuses',
      'PhD in Overthinking','Certified Main Character','Licensed Drama Expert'];
    const depts = ['Department of Vibes','Ministry of Chaos','Bureau of Good Times',
      'Institute of Zero Regrets','Academy of Questionable Choices'];
    const superpowers = ['Can smell drama from 3 rooms away','Texts back instantly when busy',
      'Remembers every embarrassing thing you ever said','Falls asleep in 30 seconds flat',
      'Can eat without looking at the food'];
    const title = titles[h % titles.length];
    const dept = depts[(h >> 3) % depts.length];
    const sp = superpowers[(h >> 5) % superpowers.length];
    const id = `DB-${((h % 90000) + 10000)}-V5`;
    await sock.sendMessage(jid, {
      text:
        `╭━━━〔 🪪 OFFICIAL ID CARD 〕━━━⬣\n` +
        `┃\n` +
        `┃ 🏛️ *Air Intelligence Agency*\n` +
        `┃ ─────────────────────────────\n` +
        `┃ 👤 *Name:*       ${n}\n` +
        `┃ 🆔 *ID Number:* ${id}\n` +
        `┃ 🎖️  *Title:*     ${title}\n` +
        `┃ 🏢 *Dept:*      ${dept}\n` +
        `┃ ─────────────────────────────\n` +
        `┃ 🦸 *Superpower:*\n` +
        `┃ ${sp}\n` +
        `┃ ─────────────────────────────\n` +
        `┃ ⚠️  *Classification:* UNHINGED\n` +
        `┃ ✅ *Status:* ACTIVE & THRIVING\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━⬣\n\n` +
        `_This is an official Air V6 document 😂_`,
    }, { quoted: msg });
  },
};

module.exports = shockCommands;
