/*
 * Copyright (c) 2020 Clarence "Sparr" Risher
 * Copyright (c) 2020 NurMarvin (Marvin Witt)
 * Licensed under the Open Software License version 3.0
 */

const { Plugin } = require('powercord/entities');
const { inject, uninject } = require('powercord/injector');
const { React, getModule, i18n: { Messages } } = require('powercord/webpack');
const i18n = require('./i18n');

module.exports = class GuildListOrderShortcuts extends Plugin {
  async startPlugin() {
    powercord.api.i18n.loadAllStrings(i18n);
    this._injectContextMenu();
  }

  async _injectContextMenu() {
    const { MenuGroup, MenuItem } = await getModule(['MenuItem']);
    const GuildContextMenu = await getModule(m => m.default && m.default.displayName === 'GuildContextMenu');

    inject('guild-list-order-shortcuts-move-to-top-context-menu', GuildContextMenu, 'default', ([{ guild }], res) => {
      res.props.children.splice(-1, 0,
        React.createElement(MenuGroup, {},
          React.createElement(MenuItem, {
            id: 'guild-list-order-shortcuts-move-to-top',
            key: 'guild-list-order-shortcuts-move-to-top',
            label: Messages.MOVE_TO_TOP,
            action: () => {
              // multiple modules contain guildFolders, not sure if this one is canonical
              const { guildFolders } = getModule([ 'guildFolders' ], false);
              // copy necessary? encountered mysterious failures to update later after attempt to modify and re-use the existing array
              var newGuildFolders = [ ...guildFolders ]
              findGuild:
              // loop over all the folders, including fake one-guild folders
              for(var folderIndex = 0; folderIndex < newGuildFolders.length; folderIndex++){ 
                const folder = newGuildFolders[folderIndex]
                // loop over every guild within a folder to find the selected guild
                for(var guildIndex = 0; guildIndex < folder.guildIds.length; guildIndex++){ 
                  if (folder.guildIds[guildIndex] === guild.id) {
                    // remove this guild from the folder
                    folder.guildIds.splice(guildIndex, 1) 
                    if (!folder.hasOwnProperty('folderId') && folder.guildIds.length == 0) {
                      // remove empty fake folders from the list
                      newGuildFolders.splice(folderIndex, 1)
                    }
                    // put this guild at the top in a new fake folder
                    newGuildFolders.unshift({guildIds: [guild.id]})
                    break findGuild
                  }
                }
              }
              // make the client and server aware of the new guildFolders structure
              getModule([ 'updateRemoteSettings' ], false).updateRemoteSettings({ guildFolders: newGuildFolders });
            }
          })
        )
      );
      return res;
    });

    // I don't know why this is here, it seems redundant after the filter condition above for getModule.
    // Copied verbatim from the guild-profile plugin until I learn why it's there.
    GuildContextMenu.default.displayName = 'GuildContextMenu';
  }

  pluginWillUnload() {
    uninject('guild-list-order-shortcuts-move-to-top-context-menu');
  }
}
