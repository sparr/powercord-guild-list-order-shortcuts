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
    const { getGuild } = await getModule([ 'getGuild' ], false);
    const { extractTimestamp } = await getModule([ 'extractTimestamp' ], false);

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
                  action: () => this._reorderGuilds((guildFolders) => {
                    findGuild:
                    // loop over all the folders, including fake one-guild folders
                    for(var folderIndex = 0; folderIndex < guildFolders.length; folderIndex++){
                      const folder = guildFolders[folderIndex];
                      // loop over every guild within a folder to find the selected guild
                      for(var guildIndex = 0; guildIndex < folder.guildIds.length; guildIndex++){
                        if (folder.guildIds[guildIndex] === guild.id) {
                          // remove this guild from the folder
                          folder.guildIds.splice(guildIndex, 1);
                          if (!folder.hasOwnProperty('folderId') && folder.guildIds.length == 0) {
                            // remove empty fake folders from the list
                            guildFolders.splice(folderIndex, 1);
                          }
                          // put this guild at the top in a new fake folder
                          guildFolders.unshift({guildIds: [guild.id]});
                          break findGuild;
                        }
                      }
                    }
                  })
                })
                ,
                React.createElement(MenuItem, {
                  id: 'guild-list-order-shortcuts-move-guild-to-bottom',
                  key: 'guild-list-order-shortcuts-move-guild-to-bottom',
                  label: Messages.TO_BOTTOM,
                  action: () => this._reorderGuilds((guildFolders) => {
                    findGuild:
                    // loop over all the folders, including fake one-guild folders
                    for(var folderIndex = 0; folderIndex < guildFolders.length; folderIndex++){
                      const folder = guildFolders[folderIndex];
                      // loop over every guild within a folder to find the selected guild
                      for(var guildIndex = 0; guildIndex < folder.guildIds.length; guildIndex++){
                        if (folder.guildIds[guildIndex] === guild.id) {
                          // remove this guild from the folder
                          folder.guildIds.splice(guildIndex, 1) ;
                          if (!folder.hasOwnProperty('folderId') && folder.guildIds.length == 0) {
                            // remove empty fake folders from the list
                            guildFolders.splice(folderIndex, 1);
                          }
                          // put this guild at the bottom in a new fake folder
                          guildFolders.push({guildIds: [guild.id]});
                          break findGuild
                        }
                      }
                    }
                  })
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
                      //TODO replicate the client behavior of using "Server Name 1, Server Name 2, ..." as the name for no-name folders
                      folderLabel = targetFolder.folderId.toString();
                    }
                    const dashName = folderLabel.replace(/[^0-9a-z]/gi, '-');
                    // build the menu item for this target folder
                    return React.createElement(MenuItem, {
                      id: 'guild-list-order-shortcuts-move-guild-to-folder-' + dashName,
                      key: 'guild-list-order-shortcuts-move-guild-to-folder-' + dashName,
                      label: folderLabel,
                      action: () => this._reorderGuilds((guildFolders) => {
                        findGuild:
                        // loop over all the folders, including fake one-guild folders
                        for(var folderIndex = 0; folderIndex < guildFolders.length; folderIndex++){
                          const folder = guildFolders[folderIndex]
                          // loop over every guild within a folder to find the selected guild
                          for(var guildIndex = 0; guildIndex < folder.guildIds.length; guildIndex++){
                            if (folder.guildIds[guildIndex] === guild.id) {
                              // remove this guild from the folder
                              folder.guildIds.splice(guildIndex, 1)
                              if (!folder.hasOwnProperty('folderId') && folder.guildIds.length == 0) {
                                // remove empty fake folders from the list
                                guildFolders.splice(folderIndex, 1)
                              }
                              // put this guild in the target folder
                              guildFolders[targetFolderIndex].guildIds.push(guild.id);
                              break findGuild
                            }
                          }
                        }
                      })
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
                  action: () => this._reorderGuilds((guildFolders) => {
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
                      // ?. because users can somehow end up with servers in their guildFolders list but not actually be in them?
                      // toUpperCase to make the sort case insensitive
                      const aName = getGuild(a.guildIds[0])?.name.toUpperCase();
                      const bName = getGuild(b.guildIds[0])?.name.toUpperCase();
                      // normal alphabetic sorting
                      if (aName < bName) return -1;
                      if (aName > bName) return 1;
                      return 0;
                    })
                  })
                })
                ,
                React.createElement(MenuItem, {
                  id: 'guild-list-order-shortcuts-sort-servers-by-join-date',
                  key: 'guild-list-order-shortcuts-sort-servers-by-join-date',
                  label: Messages.BY_JOIN_DATE,
                  action: () => this._reorderGuilds((guildFolders) => {
                    guildFolders.sort((a,b) => {
                      if (a.guildIds.length > 1) {
                        if (b.guildIds.length > 1) {
                          return 0;
                        }
                        return 1;
                      }
                      const aDate = getGuild(a.guildIds[0])?.joinedAt;
                      const bDate = getGuild(b.guildIds[0])?.joinedAt;
                      if (aDate < bDate) return -1;
                      if (aDate > bDate) return 1;
                      return 0;
                    })
                  })
                })
                ,
                React.createElement(MenuItem, {
                  id: 'guild-list-order-shortcuts-sort-servers-by-creation-date',
                  key: 'guild-list-order-shortcuts-sort-servers-by-creation-date',
                  label: Messages.BY_CREATION_DATE,
                  action: () => this._reorderGuilds((guildFolders) => {
                    guildFolders.sort((a,b) => {
                      if (a.guildIds.length > 1) {
                        if (b.guildIds.length > 1) {
                          return 0;
                        }
                        return 1;
                      }
                      const aDate = extractTimestamp(a.guildIds[0]);
                      const bDate = extractTimestamp(b.guildIds[0]);
                      if (aDate < bDate) return -1;
                      if (aDate > bDate) return 1;
                      return 0;
                    })
                  })
                })
                ,
                React.createElement(MenuItem, {
                  id: 'guild-list-order-shortcuts-sort-servers-randomly',
                  key: 'guild-list-order-shortcuts-sort-servers-randomly',
                  label: Messages.RANDOMLY,
                  action: () => this._reorderGuilds((guildFolders) => {
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

    // I don't know why this is here, it seems redundant after the filter condition above for getModule.
    // Copied verbatim from the guild-profile plugin until I learn why it's there.
    GuildContextMenu.default.displayName = 'GuildContextMenu';
  }

  _reorderGuilds(reorderFunc) {
    const { guildFolders } = getModule([ 'guildFolders' ], false);
    // copy necessary? encountered mysterious failures to update later after attempt to modify and re-use the existing array
    var newGuildFolders = [ ...guildFolders ]
    // apply the given reordering function
    reorderFunc(newGuildFolders)
    // make the client and server aware of the new guildFolders structure
    getModule([ 'updateRemoteSettings' ], false).updateRemoteSettings({ guildFolders: newGuildFolders });
  }

  pluginWillUnload() {
    uninject('guild-list-order-shortcuts-context-menu');
  }
}
