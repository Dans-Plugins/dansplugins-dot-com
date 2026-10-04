// Currencies: a faction leader holding a gold nugget makes it the faction's
// coin, mints three, and looks the new currency up. A chat clip.
module.exports = {
  kind: 'chat',
  aspect: '16:10',
  poster: 8.6,
  alt: 'Currencies in Minecraft chat: /currency create Ducat offers to rename the held gold nugget, the currency is created, /currency mint Ducat 3 mints three coins, and /currency info Ducat shows it belongs to the faction Southmarch with 3 minted. A recreation of the chat panel; every line is the plugin\'s real output from a test server.',
  // Setup the clip does not show: Rowena already leads the faction Southmarch
  // and is given gold nuggets to hold (the item a currency is made from, and
  // what minting costs).
  async capture(h) {
    const p = await h.bot('Rowena');
    await h.sleep(2000);
    await h.rcon(['clear Rowena', 'give Rowena gold_nugget 8']);
    p.setQuickBarSlot(0);
    await h.sleep(2000);
    h.start(p);
    await h.sleep(1500);
    h.mark('in');
    await h.send('/currency create Ducat', 2300);
    await h.send('/currency create Ducat --rename', 2000);
    await h.send('/currency mint Ducat 3', 2000);
    await h.send('/currency info Ducat', 3400);
    h.mark('out');
    p.quit();
    await h.sleep(1500);
  },
};
