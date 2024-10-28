import { CST } from "../CST.mjs";
import { socket } from "../CST.mjs";
import { SocketWorker } from "../share/SocketWorker.mjs";

import { createUIBottom, createUIRight, createUITop, createUI, createUILeftMobile, createExitMenu, createAvatarDialog } from "../share/UICreator.mjs";
import { isMobile } from "../share/UICreator.mjs";

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: CST.SCENE.GAMESCENE });

        this.otherCursors = {};
        this.player = {};

        this.codeRoom = null;

        this.isOverlayVisible = false;

        this.mobileFlag = isMobile();

        this.overlayBackground;

        this.overlayFlag = false;
    }

    preload() {
        this.load.image('map', './assets/map/map.jpg');
        this.load.image('cursorBack', './assets/cursors/cursorBack.png');
        this.load.image('clickCursor', './assets/cursors/clickCursor.png');

        this.load.image('overlayBackground', './assets/keys/overlayBackground.png');
    }

    create() {
        this.mySocket = new SocketWorker(socket);

        // Подписываемся на получение информации об игроках
        this.mySocket.subscribeExistedPlayers(this, this.createPlayers);
        this.mySocket.subscribeNewPlayer(this, this.createNewPlayer);
        this.mySocket.subscribePlayerDisconected(this, this.removePlayer);
        this.mySocket.subscribePlayerRecconected(this, this.onReconnect);

        this.createMap('map');

        createUIBottom(this);
        createUIRight(this);
        createUITop(this);

        if (this.mobileFlag) createUILeftMobile(this, 'settingsMobile', 'exitMobile', 90, 70, this.cameras.main.width - 90, 70, this.showSettings, this.showExitMenu);
        else createUI(this, this.showSettings, this.showExitMenu);

        createExitMenu(this, this.leaveGame, this.closeExitMenu, this.mobileFlag);

        // Запрашиваем список игроков
        this.mySocket.emitGetPlayers();

        createAvatarDialog(this, this.enterNewSettingsInAvatarDialog, this.closeAvatarDialog, this.codeRoom, this.mobileFlag);

        this.createZonesOnMap();

        this.input.keyboard.on('keydown-ESC', () => {
            this.hideInfoImage();
        });
    }


    createMap(map) {
        const map1 = this.add.image(0, 0, map).setOrigin(0.5, 0.5).setPosition(this.cameras.main.width / 2, this.cameras.main.height / 2);

        map1.setInteractive();

        map1.on('pointerdown', () => {
            if (this.overlayFlag) this.hideInfoImage();
        });
    }

    initCursors(data) {
        this.player.character = data.character;
        this.player.name = data.name;

        this.cursorImage = this.add.image(-100, -100, 'cursorBack').setOrigin(0.1, 0.1).setScale(0.7).setDepth(6).setScrollFactor(0);
        this.cursorPlayerImg = this.add.image(-100, -100, `char${this.player.character}`).setOrigin(-0.1, -0.35).setScale(0.8).setDepth(6).setScrollFactor(0);;
        this.cursorName = this.add.text(-100, -100, `${this.player.name}`, { font: "12px Handlee", fill: '#FFFFFF', align: 'center' }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(6);

        this.game.canvas.style.cursor = 'none';

        this.input.on('pointermove', (pointer) => {
            this.moveCursor(pointer.x, pointer.y);
            this.sendCursorPositionToServer(pointer.x, pointer.y);
        });

        this.clickCursor = this.add.image(-100, -100, 'clickCursor').setOrigin(0.48, 0.85).setScale(1).setDepth(6).setScrollFactor(0);
        this.clickCursor.setVisible(false);
    }

    moveCursor(x, y) {
        this.cursorImage.setPosition(x, y);
        this.cursorPlayerImg.setPosition(x, y);
        this.cursorName.setPosition(x + 30, y + 13);

        this.clickCursor.setPosition(x, y);
    }

    createZonesOnMap() {
        this.createImg();

        this.createZone(255, 206, 50, 15, 'Harrow');
        this.createZone(405, 113, 60, 15, 'Edgware');
        this.createZone(358, 265, 65, 15, 'Wembley');
        this.createZone(495, 372, 115, 15, 'NottingHill');
        this.createZone(325, 514, 65, 15, 'Richmond');
        this.createZone(130, 560, 60, 15, 'Feltham');
        this.createZone(475, 628, 100, 15, 'Wimbledon');
        this.createZone(573, 667, 65, 15, 'Mitcham');
        this.createZone(640, 593, 100, 15, 'Streatham');
        this.createZone(665, 515, 75, 15, 'Brixton');
        this.createZone(830, 653, 75, 15, 'Beckenham');
        this.createZone(1060, 603, 45, 15, 'Sidcup');
        this.createZone(1000, 442, 90, 15, 'Woolwich');
        this.createZone(1015, 315, 50, 15, 'Barking');
        this.createZone(875, 305, 95, 15, 'Stratford');
        this.createZone(935, 143, 90, 15, 'Woodford');
        this.createZone(890, 70, 94, 15, 'Chingford');
        this.createZone(675, 160, 110, 15, 'WoodGreen');
        this.createZone(617, 313, 125, 15, 'CamdenTown');
    }

    createZone(x, y, w, h, texture) {
        let zone = this.add.zone(x, y, w, h).setOrigin(0.5, 0.5).setInteractive();

        zone.on('pointerdown', () => {
            if (!this.overlayBackground.visible) {
                this.showInfoImage(texture);

                this.cursorImage.setVisible(true);
                this.cursorPlayerImg.setVisible(true);
                this.cursorName.setVisible(true);

                this.clickCursor.setVisible(false);
            } else {
                this.hideInfoImage();
            }
        });

        zone.on('pointerover', () => {
            if (!this.overlayBackground.visible) {
                this.cursorImage.setVisible(false);
                this.cursorPlayerImg.setVisible(false);
                this.cursorName.setVisible(false);

                this.clickCursor.setVisible(true);
            }
        });
        zone.on('pointerout', () => {
            this.cursorImage.setVisible(true);
            this.cursorPlayerImg.setVisible(true);
            this.cursorName.setVisible(true);

            this.clickCursor.setVisible(false);
        });
    }

    createImg() {
        this.overlayBackground = this.add.image(this.cameras.main.width / 2 + 37, this.cameras.main.height / 2, 'overlayBackground');
        this.overlayBackground.setScale(0.85)
        this.overlayBackground.setDepth(5);

        this.img = this.add.image(this.cameras.main.width / 2 + 25, this.cameras.main.height / 2, 'Wembley');
        this.img.setScale(0.85)
        this.img.setDepth(5);

        this.close = this.add.image(1200, 60, 'closeIcon')
        this.close.setDepth(5);

        this.overlayBackground.setVisible(false);
        this.img.setVisible(false);
        this.close.setVisible(false);
    }

    showInfoImage(texture) {
        this.img.setTexture(texture);

        this.overlayBackground.setVisible(true);
        this.img.setVisible(true);
        this.close.setVisible(true);

        this.overlayFlag = true;
    }

    hideInfoImage() {
        this.overlayBackground.setVisible(false);
        this.img.setVisible(false);
        this.close.setVisible(false);

        this.overlayFlag = false;
    }

    sendCursorPositionToServer(x, y) {
        this.mySocket.emitCursorMove({ id: this.mySocket.socket.id, x: x, y: y });
    }

    createOtherPlayer(playerInfo) {
        if (!this.otherCursors[playerInfo.id]) {
            this.otherCursors[playerInfo.id] = {};
            this.otherCursors[playerInfo.id].cursor = this.add.image(-100, -100, 'cursorBack').setOrigin(0.1, 0.1).setDepth(4).setScale(0.7).setScrollFactor(0);
            this.otherCursors[playerInfo.id].cursorImg = this.add.image(-100, -100, `char${playerInfo.character}`).setOrigin(-0.1, -0.35).setScale(0.8).setDepth(4).setScrollFactor(0);
            this.otherCursors[playerInfo.id].cursorName = this.add.text(-100, -100, `${playerInfo.name}`, { font: "bold 12px Handlee", fill: '#FFFFFF', align: 'center' }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(4);
        }
    }

    createPlayers(players) {
        Object.keys(players).forEach((id) => {
            if (id === socket.id) {
                this.initCursors(players[id]);
            } else {
                this.createOtherPlayer(players[id]);
            }
        });

        this.mySocket.subscribeCursorMove(this, this.updateCursor);
    }

    createNewPlayer(newPlayer) {
        if (!this.otherCursors[newPlayer.id]) {
            this.otherCursors[newPlayer.id] = {};
            this.otherCursors[newPlayer.id].cursor = this.add.image(-100, -100, 'cursorBack').setOrigin(0.1, 0.1).setDepth(4).setScale(0.7).setScrollFactor(0);
            this.otherCursors[newPlayer.id].cursorImg = this.add.image(-100, -100, `char${newPlayer.character}`).setOrigin(-0.1, -0.35).setScale(0.8).setDepth(4).setScrollFactor(0);
            this.otherCursors[newPlayer.id].cursorName = this.add.text(-100, -100, `${newPlayer.name}`, { font: "bold 12px Handlee", fill: '#FFFFFF', align: 'center' }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(4);
        }
    }

    removePlayer(id) {
        if (this.otherCursors[id]) {
            this.otherCursors[id].cursor.destroy();
            this.otherCursors[id].cursorImg.destroy();
            this.otherCursors[id].cursorName.destroy();
            delete this.otherCursors[id]
        }
    }

    updateCursor(data) {
        if (this.otherCursors[data.id]) {
            const cursor = this.otherCursors[data.id].cursor;
            const cursorImg = this.otherCursors[data.id].cursorImg
            const cursorName = this.otherCursors[data.id].cursorName

            this.tweens.add({
                targets: [cursor, cursorImg],
                x: data.x,
                y: data.y,
                duration: 200,
            });

            this.tweens.add({
                targets: [cursorName],
                x: data.x + 30,
                y: data.y + 13,
                duration: 200,
            });
        }
    }

    onReconnect(playerInfo) {
        if (this.otherCursors[playerInfo.id]) {
            this.otherCursors[playerInfo.id].cursorImg.setTexture(`char${playerInfo.character}`);
            this.otherCursors[playerInfo.id].cursorName.setText(playerInfo.name);
        }
    }

    update() {

    }

    leaveGame(self) {
        window.location.reload();
    }

    closeExitMenu(self) {
        self.exitContainer.setVisible(false);
        self.isOverlayVisible = false
    }

    showSettings(self) {
        self.avatarDialog.setPosition(self.cameras.main.scrollX + 640, self.cameras.main.scrollY + 360);
        self.avatarDialog.setVisible(true);
        self.isOverlayVisible = true
        self.exitContainer.setVisible(false);
    }

    showExitMenu(self) {
        self.exitContainer.setPosition(self.cameras.main.scrollX + 640, self.cameras.main.scrollY + 360);
        self.exitContainer.setVisible(true);
        self.isOverlayVisible = true
        self.avatarDialog.setVisible(false);
    }

    enterNewSettingsInAvatarDialog(self, usernameInput, nameError, imgCount) {
        const username = usernameInput.value;
        if (username.length < 1 || username.length > 10) {
            nameError.style.visibility = "visible";
        } else {
            self.mySocket.emitPlayerReconnect({ avatar: imgCount + 1, name: username });
            self.avatarDialog.setVisible(false);
            self.isOverlayVisible = false;
            nameError.style.visibility = "hidden";

            self.player.character = imgCount + 1;
            self.player.name = username;

            self.cursorPlayerImg.setTexture(`char${self.player.character}`)
            self.cursorName.setText(self.player.name)
        }
    }

    closeAvatarDialog(self) {
        self.avatarDialog.setVisible(false);
        self.isOverlayVisible = false;
    }
}
