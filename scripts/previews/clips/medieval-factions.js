// Medieval Factions: a new player founds a faction, claims the chunk they
// stand in, and opens the territory map, which shows the new claim among
// the neighbouring factions'. A chat clip: captured for real, drawn by the panel.
module.exports = {
  kind: 'chat',
  aspect: '16:10',
  poster: 8.4,
  alt: 'Medieval Factions in Minecraft chat: /mf create Oakvale founds a faction, /mf claim claims the chunk, and /mf map shows the new claim between two neighbouring factions\' territory. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  // Setup the clip does not show: the neighbouring factions on the map were
  // founded and claimed by other bots beforehand (see the README).
  async capture(h) {
    const p = await h.bot('Rowan');
    await h.sleep(1500);
    await h.rcon(['spreadplayers -8 72 0 1 false Rowan']);
    // A retake: leave the previous take's faction first (MF picks a random
    // colour for a new faction, and a take is redone when it is too close to
    // the wilderness green to see on the map).
    p.chat('/mf disband');
    await h.sleep(3000);
    h.start(p);
    await h.sleep(1600);
    h.mark('in');
    await h.send('/mf create Oakvale', 2600);
    await h.send('/mf claim', 2400);
    await h.send('/mf map', 3600);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
