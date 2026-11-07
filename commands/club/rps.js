const {
    SlashCommandBuilder, EmbedBuilder,
    ActionRowBuilder, ButtonBuilder,
    ButtonStyle, StringSelectMenuBuilder,
    ComponentType, MessageFlags,
} = require('discord.js')

const LOBBY_TIMEOUT = 60_000 // 60 detik buat nunggu player
const ROUND_TIMEOUT = 30_000 // 30 detik buat milih tiap round
const NEXT_ROUND_DELAY = 3_000 // jeda antar round
const DEFAULT_TARGET = 5

const CHOICES = {
    rock: { emoji: '🪨', label: 'Rock', beats: 'scissors' },
    paper: { emoji: '📄', label: 'Paper', beats: 'rock' },
    scissors: { emoji: '✂️', label: 'Scissors', beats: 'paper' },
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const randomChoice = () => Object.keys(CHOICES)[Math.floor(Math.random() * 3)]
const fmt = (key) => `${CHOICES[key].emoji} ${CHOICES[key].label}`

const makePlayer = (user, isAI = false) => ({
    id: user.id,
    isAI,
    display: isAI ? '🤖 Bot' : `<@${user.id}>`,
})

function lobbyPayload(state, disabled = false) {
    const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🪨📄✂️ Rock Paper Scissors')
        .setDescription(
            'Klik **Join** buat ikut main (max 2 player).\n' +
            'Kalau cuma sendirian, host bisa klik **Start** buat lawan Bot.'
        )
        .addFields(
            {
                name: `Players (${state.players.length}/2)`,
                value: state.players.map((p) => p.display).join('\n'),
                inline: true,
            },
            { name: 'First to', value: `**${state.target}** points`, inline: true }
        )
        .setFooter({ text: `Lobby ditutup otomatis dalam ${LOBBY_TIMEOUT / 1000} detik` })

    const select = new StringSelectMenuBuilder()
        .setCustomId('rps_points')
        .setPlaceholder('Pilih point buat menang (host only)')
        .setDisabled(disabled)
        .addOptions(
            [3, 5, 7, 10].map((n) => ({
                label: `First to ${n}`,
                value: String(n),
                default: n === state.target,
            }))
        )

    const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('rps_join')
            .setLabel('Join')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled || state.players.length >= 2),
        new ButtonBuilder()
            .setCustomId('rps_start')
            .setLabel(state.players.length === 1 ? 'Start vs Bot' : 'Start')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId('rps_cancel')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled)
    )

    return {
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(select), buttons],
    }
}

function roundEmbed({ players, scores, target, round, picks }) {
    return new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle(`Round ${round}`)
        .setDescription(
            players
                .map((p) => {
                    const status = p.isAI || picks.has(p.id) ? '✅ Sudah milih' : '⏳ Belum milih'
                    return `${p.display} — ${status}`
                })
                .join('\n')
        )
        .addFields({ name: 'Score', value: scoreLine(players, scores) })
        .setFooter({ text: `First to ${target} wins • ${ROUND_TIMEOUT / 1000} detik buat milih` })
}

const scoreLine = (players, scores) =>
    players.map((p) => `${p.display}: **${scores.get(p.id)}**`).join('  |  ')

function choiceRow(disabled = false) {
    return new ActionRowBuilder().addComponents(
        Object.entries(CHOICES).map(([key, c]) =>
            new ButtonBuilder()
                .setCustomId(`rps_pick_${key}`)
                .setLabel(c.label)
                .setEmoji(c.emoji)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        )
    )
}

function decide(a, b) {
    if (a === b) return 0
    return CHOICES[a].beats === b ? 1 : 2
}

function collectPicks(message, players, picks, render) {
    const humans = players.filter((p) => !p.isAI)

    return new Promise((resolve) => {
        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: (i) => i.customId.startsWith('rps_pick_'),
            time: ROUND_TIMEOUT,
        })

        collector.on('collect', async (i) => {
            if (!humans.some((p) => p.id === i.user.id)) {
                return i.reply({
                    content: '❌ Kamu bukan player di game ini.',
                    flags: MessageFlags.Ephemeral,
                })
            }
            if (picks.has(i.user.id)) {
                return i.reply({
                    content: '⚠️ Kamu sudah milih di round ini.',
                    flags: MessageFlags.Ephemeral,
                })
            }

            const choice = i.customId.replace('rps_pick_', '')
            if (!Object.hasOwn(CHOICES, choice)) {
                return i.reply({
                    content: '❌ Pilihan tidak valid. Pilih Rock, Paper, atau Scissors.',
                    flags: MessageFlags.Ephemeral,
                })
            }
            picks.set(i.user.id, choice)

            await i.reply({
                content: `Kamu milih **${fmt(choice)}**`,
                components: [
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('rps_choice_locked')
                            .setLabel('Choice locked in')
                            .setEmoji('✅')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(true)
                    ),
                ],
                flags: MessageFlags.Ephemeral,
            })

            if (humans.every((p) => picks.has(p.id))) {
                collector.stop('done')
            } else {
                await message.edit(render()).catch(() => {})
            }
        })

        collector.on('end', (_, reason) => resolve(reason === 'done' ? 'done' : 'time'))
    })
}

async function playGame(message, players, target) {
    const scores = new Map(players.map((p) => [p.id, 0]))
    let round = 1

    while (true) {
        const picks = new Map()
        const ai = players.find((p) => p.isAI)
        if (ai) picks.set(ai.id, randomChoice())

        const render = () => ({
            embeds: [roundEmbed({ players, scores, target, round, picks })],
            components: [choiceRow()],
        })

        await message.edit(render())
        const result = await collectPicks(message, players, picks, render)

        if (result === 'time' && !players.every((p) => picks.has(p.id))) {
            const missing = players.filter((p) => !picks.has(p.id))
            const present = players.filter((p) => picks.has(p.id) && !p.isAI)

            let desc = '⏰ Nggak ada yang milih, game dibatalkan.'
            if (present.length === 1 && missing.length === 1 && !missing[0].isAI) {
                desc = `⏰ ${missing[0].display} AFK. ${present[0].display} menang by forfeit! 🏆`
            } else if (missing.some((p) => !p.isAI) && players.some((p) => p.isAI)) {
                desc = '⏰ Kamu kelamaan milih, game dibatalkan.'
            }

            return message.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(0xed4245)
                        .setTitle('Game berakhir')
                        .setDescription(desc)
                        .addFields({ name: 'Final score', value: scoreLine(players, scores) }),
                ],
                components: [choiceRow(true)],
            })
        }

        const [p1, p2] = players
        const c1 = picks.get(p1.id)
        const c2 = picks.get(p2.id)
        const outcome = decide(c1, c2)

        let verdict = '🤝 Seri!'
        if (outcome === 1) {
            scores.set(p1.id, scores.get(p1.id) + 1)
            verdict = `✅ ${p1.display} menang round ini!`
        } else if (outcome === 2) {
            scores.set(p2.id, scores.get(p2.id) + 1)
            verdict = `✅ ${p2.display} menang round ini!`
        }

        const winner = players.find((p) => scores.get(p.id) >= target)

        const resultEmbed = new EmbedBuilder()
            .setColor(winner ? 0x57f287 : 0x5865f2)
            .setTitle(winner ? `🏆 ${winner.isAI ? 'Bot' : 'Winner'}!` : `Round ${round} selesai`)
            .setDescription(
                `${p1.display}: **${fmt(c1)}**\n${p2.display}: **${fmt(c2)}**\n\n${verdict}` +
                (winner ? `\n\n🎉 ${winner.display} menang game ini!` : '')
            )
            .addFields({ name: 'Score', value: scoreLine(players, scores) })

        await message.edit({ embeds: [resultEmbed], components: [choiceRow(true)] })

        if (winner) return
        round++
        await sleep(NEXT_ROUND_DELAY)
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('A classic jankenpon aka rock paper shoot!')
        .setContexts(0),

    async execute(interaction) {
        const host = makePlayer(interaction.user)
        const state = { players: [host], target: DEFAULT_TARGET }

        await interaction.reply(lobbyPayload(state))
        const message = await interaction.fetchReply()

        const collector = message.createMessageComponentCollector({ time: LOBBY_TIMEOUT })

        collector.on('collect', async (i) => {
            const isHost = i.user.id === host.id

            switch (i.customId) {
                case 'rps_join': {
                    if (state.players.some((p) => p.id === i.user.id)) {
                        return i.reply({
                            content: '⚠️ Kamu sudah join.',
                            flags: MessageFlags.Ephemeral,
                        })
                    }
                    if (state.players.length >= 2) {
                        return i.reply({
                            content: '❌ Lobby sudah penuh (2/2).',
                            flags: MessageFlags.Ephemeral,
                        })
                    }
                    state.players.push(makePlayer(i.user))
                    await i.update(lobbyPayload(state))
                    return
                }

                case 'rps_points': {
                    if (!isHost) {
                        return i.reply({
                            content: '❌ Cuma host yang bisa ganti point.',
                            flags: MessageFlags.Ephemeral,
                        })
                    }
                    state.target = Number(i.values[0])
                    return i.update(lobbyPayload(state))
                }

                case 'rps_start': {
                    if (!isHost) {
                        return i.reply({
                            content: '❌ Cuma host yang bisa start.',
                            flags: MessageFlags.Ephemeral,
                        })
                    }
                    await i.deferUpdate()
                    return collector.stop('start')
                }

                case 'rps_cancel': {
                    if (!isHost) {
                        return i.reply({
                            content: '❌ Cuma host yang bisa cancel.',
                            flags: MessageFlags.Ephemeral,
                        })
                    }
                    await i.deferUpdate()
                    return collector.stop('cancel')
                }
            }
        })

        collector.on('end', async (_, reason) => {
            if (reason === 'start') {
                if (state.players.length === 1) {
                    state.players.push(makePlayer(interaction.client.user, true))
                }
                try {
                    await playGame(message, state.players, state.target)
                } catch (err) {
                    console.error('[rps] game error:', err)
                }
                return
            }

            const text =
                reason === 'cancel'
                    ? '🚫 Game dibatalkan oleh host.'
                    : '⏰ Lobby timeout, nggak ada yang mulai game.'

            await message
                .edit({
                    embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(text)],
                    components: lobbyPayload(state, true).components,
                })
                .catch(() => {})
        })
    },
}