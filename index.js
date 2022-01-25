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
    
    this.lazyPatchContextMenu('GuildContextMenu', async (GuildContextMenu) => {
      const { MenuGroup, MenuItem } = await getModule(['MenuItem']);
      const { getGuild } = await getModule([ 'getGuild' ]);
      const { extractTimestamp } = await getModule([ 'extractTimestamp' ]);

      inject('guild-list-order-shortcuts-context-menu', GuildContextMenu, 'default', ([{ guild }], res) => {
        const { guildFolders } = getModule([ 'guildFolders' ], false);
        res.props.children.push(
          React.createElement(MenuGroup, {}, [
              React.createElement(MenuItem, {
                id: 'guild-list-order-shortcuts-move-guild',
                key: 'guild-list-order-shortcuts-move-guild',
                label: Messages.MOVE_GUILD,
                children: [
                  React.createElement(MenuItem, {
                    id: 'guild-list-order-shortcuts-move-guild-to-top',
                    key: 'guild-list-order-shortcuts-move-guild-to-top',
                    label: Messages.TO_TOP,
                    action: () => this._moveSingleGuildById(guild.id, (guildFolders, guildId) => guildFolders.unshift({guildIds: [guildId]}))
                  })
                  ,
                  React.createElement(MenuItem, {
                    id: 'guild-list-order-shortcuts-move-guild-to-bottom',
                    key: 'guild-list-order-shortcuts-move-guild-to-bottom',
                    label: Messages.TO_BOTTOM,
                    action: () => this._moveSingleGuildById(guild.id, (guildFolders, guildId) => guildFolders.push({guildIds: [guildId]}))
                  })
                  ,
                  React.createElement(MenuItem, {
                    id: 'guild-list-order-shortcuts-move-guild-to-folder',
                    key: 'guild-list-order-shortcuts-move-guild-to-folder',
                    label: Messages.TO_FOLDER,
                    children: guildFolders.map((targetFolder, targetFolderIndex) => {
                      // filter out fake folders
                      if (!('folderId' in targetFolder)) return null;
                      var folderLabel;
                      if ('folderName' in targetFolder) {
                        folderLabel = targetFolder.folderName;
                      } else {
                        folderLabel = getGuild(targetFolder.guildIds[0])?.name + ', ...';
                      }
                      // build the menu item for this target folder
                      return React.createElement(MenuItem, {
                        id: 'guild-list-order-shortcuts-move-guild-to-folder-' + targetFolder.folderId,
                        key: 'guild-list-order-shortcuts-move-guild-to-folder-' + targetFolder.folderId,
                        label: folderLabel,
                        action: () => this._moveSingleGuildById(guild.id, (guildFolders, guildId) => guildFolders[targetFolderIndex].guildIds.push(guild.id))
                      })
                    }).filter(e => e)
                  })
                ]
              })
              ,
              React.createElement(MenuItem, {
                id: 'guild-list-order-shortcuts-sort-servers',
                key: 'guild-list-order-shortcuts-sort-servers',
                label: Messages.SORT_GUILDS,
                children: [
                  React.createElement(MenuItem, {
                    id: 'guild-list-order-shortcuts-sort-servers-alphabetically',
                    key: 'guild-list-order-shortcuts-sort-servers-alphabetically',
                    label: Messages.ALPHABETICALLY,
                    // guild name, convert non-letters/numbers to spaces, trim leading/trailing spaces, case insensitive
                    action: () => this._sortGuildFolders(guildId => getGuild(guildId)?.name.replace(/[^\p{L}\p{N}]/gu, ' ').trim().toUpperCase())
                  })
                  ,
                  React.createElement(MenuItem, {
                    id: 'guild-list-order-shortcuts-sort-servers-by-join-date',
                    key: 'guild-list-order-shortcuts-sort-servers-by-join-date',
                    label: Messages.BY_JOIN_DATE,
                    action: () => this._sortGuildFolders(guildId => getGuild(guildId)?.joinedAt)
                  })
                  ,
                  React.createElement(MenuItem, {
                    id: 'guild-list-order-shortcuts-sort-servers-by-creation-date',
                    key: 'guild-list-order-shortcuts-sort-servers-by-creation-date',
                    label: Messages.BY_CREATION_DATE,
                    action: () => this._sortGuildFolders(guildId => extractTimestamp(guildId))
                  })
                  ,
                  React.createElement(MenuItem, {
                    id: 'guild-list-order-shortcuts-sort-servers-randomly',
                    key: 'guild-list-order-shortcuts-sort-servers-randomly',
                    label: Messages.RANDOMLY,
                    action: () => this._reorderGuildFolders((guildFolders) => {
                      // Durstenfeld shuffle from https://stackoverflow.com/a/12646864/13675
                      for (let i = guildFolders.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [guildFolders[i], guildFolders[j]] = [guildFolders[j], guildFolders[i]];
                      }
                    })
                  })
                ]
              })
            ]
          )
        );

        return res;
      });
      GuildContextMenu.default.displayName = 'GuildContextMenu';
    });
  }

  // Credit to SammCheese
  // "due to the recent update, discord has made many components only exportable once it's loaded
  //  otherwise, the components doesn't exist
  //  SammCheese's lazy patching is just called lazy because discord is also lazy
  //  it just finds a components that will forcefully load the component 
  //  then it will patch that component once it's loaded" - @King Fish#0723
  async lazyPatchContextMenu(displayName, patch) {
    const filter = m => m.default && m.default.displayName === displayName
    const m = getModule(filter, false)
    if (m) patch(m)
    else {
      const module = getModule([ 'openContextMenuLazy' ], false)
      inject('guild-list-order-shortcuts-lazy-contextmenu', module, 'openContextMenuLazy', args => {
        const lazyRender = args[1]
        args[1] = async () => {
          const render = await lazyRender(args[0])

          return (config) => {
            const menu = render(config)
            if (menu?.type?.displayName === displayName && patch) {
              uninject('guild-list-order-shortcuts-lazy-contextmenu')
              patch(getModule(filter, false))
              patch = false
            }
          return menu
          }
        }
        return args
      }, true)
    }
  }
  
  /**
   * Reorder the Guild list using a callback
   * @param {callback} guildFoldersReorderFunc - Function that reorders a guildFolders array in place
   */  
  _reorderGuildFolders(guildFoldersReorderFunc) {
    const { guildFolders } = getModule([ 'guildFolders' ], false);
    // copy necessary? encountered mysterious failures to update later after attempt to modify and re-use the existing array
    var newGuildFolders = [ ...guildFolders ]
    // apply the given reordering function
    guildFoldersReorderFunc(newGuildFolders)
    // make the client and server aware of the new guildFolders structure
    getModule([ 'updateRemoteSettings' ], false).updateRemoteSettings({ guildFolders: newGuildFolders });
  }

  /**
   * Reorder the Guild list, moving a single guild to a new location
   * @param {string} guildId - numeric ID of the guild as a string
   * @param {callback} pasteFunc - Function that puts the guild in its new location after it has been "cut"
   */  
  _moveSingleGuildById(guildId, pasteFunc) {
    this._reorderGuildFolders((guildFolders) => {
      findGuild:
      // loop over all the folders, including fake one-guild folders
      for(var folderIndex = 0; folderIndex < guildFolders.length; folderIndex++){
        const folder = guildFolders[folderIndex];
        // loop over every guild within a folder to find the selected guild
        for(var guildIndex = 0; guildIndex < folder.guildIds.length; guildIndex++){
          if (folder.guildIds[guildIndex] === guildId) {
            // remove this guild from the folder
            folder.guildIds.splice(guildIndex, 1) ;
            // put the guild in its new location
            pasteFunc(guildFolders, guildId);
            if (!folder.hasOwnProperty('folderId') && folder.guildIds.length == 0) {
              // remove now-empty fake folder from the list
              guildFolders.splice(folderIndex, 1);
            }
            break findGuild
          }
        }
      }
    });
  }

  /**
   * Sort the guild list according to some key function
   * @param {callback} guildIdKeyFunc - Function that exctracts a key for a guild based on its id
   */  
  _sortGuildFolders(guildIdKeyFunc) {
    this._reorderGuildFolders((guildFolders) => {
      guildFolders.sort((a,b) => {
        // real folders have a folderId and get sorted to the bottom
        if ('folderId' in a) {
          if ('folderId' in b) {
            return 0;
          }
          return 1;
        }
        if ('folderId' in b) {
          return -1;
        }
        const aCmp = guildIdKeyFunc(a.guildIds[0]);
        const bCmp = guildIdKeyFunc(b.guildIds[0]);
        if (aCmp < bCmp) return -1;
        if (aCmp > bCmp) return 1;
        return 0;
      })
    });
  }

  pluginWillUnload() {
    uninject('guild-list-order-shortcuts-context-menu');
  }
}
