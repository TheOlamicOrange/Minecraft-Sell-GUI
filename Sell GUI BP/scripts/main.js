import { world, system } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

import { sellSettings } from "./sellConfigurations";

// Constants
export const DYNAMIC_PROPERTY_KEY = "sellGui:validIds";
export const SELL_ID_OBJECTIVE = "sellGuiID";

// Map to store valid IDs
export let validIds = loadValidIds();

// Load valid IDs from storage
function loadValidIds() {
    const storage = world.getDynamicProperty(DYNAMIC_PROPERTY_KEY);
    return storage ? new Map(Object.entries(JSON.parse(storage))) : new Map();
}

export let validPlayers = loadValidPlayers();

function loadValidPlayers() {
    const storedList = world.getDynamicProperty("sellGui:validPlayers");
    if (storedList) return JSON.parse(storedList);
    return []; // Default DevAccess if nothing is stored
}

export function saveValidPlayers() {
    world.setDynamicProperty("sellGui:validPlayers", JSON.stringify(validPlayers));
}

export let owner = world.getDynamicProperty("TheOlamicOrangePacks:owner");

world.beforeEvents.itemUse.subscribe(data => {
    let player = data.source;
    if (data.itemStack.typeId == "sellgui:sell_gui_settings") {
        if(owner) { // Exists
            return system.run(() => sellSettings(player));
        }
        system.run(() => defineOwner(player));
    }
});

function defineOwner(player) {
    const form = new ActionFormData();
    form.title(`Owner Initialization`);
    form.body(`Press this button to claim owner status`);
    form.button(`Claim`);
    form.show(player).then(r => {
        if (r.selection == 0) { 
            owner = player.id;
            world.setDynamicProperty("TheOlamicOrangePacks:owner", player.id);
            validPlayers.push(owner);
            saveValidPlayers();
        }
    });
}

// Main sell UI functionality
function sellUI() {
    // Retrieve or initialize the "sellGuiID" scoreboard
    let sellID = world.scoreboard.getObjective(SELL_ID_OBJECTIVE) || world.scoreboard.addObjective(SELL_ID_OBJECTIVE);
    for (const identity of sellID.getParticipants()) {
        if (identity.type === "Player") {
            const player = identity.getEntity();
            const id = sellID.getScore(player);
            sellID.removeParticipant(player);
            
            if (validIds.has(String(id))) {
                const validId = validIds.get(String(id));
                const itemId = validId.itemId;
                const inventory = player.getComponent("minecraft:inventory").container;
                const itemAmount = getItemAmount(inventory, itemId);
                if (itemAmount !== 0) {
                    const form = new ModalFormData();
                    form.title(`Sell ${validId.itemDisplayName}`);
                    form.slider("Select Amount to Sell", 1, itemAmount, 1);
                    form.show(player).then(r => {
                        if (r.canceled) return;
                        const moneyScoreboard = world.scoreboard.getObjective(validId.scoreboard);
                        if (moneyScoreboard) {
                            const sellAmount = r.formValues[0];
                            player.runCommandAsync(`/clear @s ${itemId} 0 ${sellAmount}`);
                            player.runCommandAsync(`/scoreboard players add @s ${moneyScoreboard.id} ${sellAmount * validId.value}`);
                            player.runCommandAsync(`/tellraw @s {"rawtext":[{"text":"You sold ${sellAmount} item(s) of ${validId.itemDisplayName}, for ${sellAmount * validId.value}"}]}`);
                        }
                    });
                } else {
                    player.runCommandAsync(`/tellraw @s {"rawtext":[{"text":"You don't have any items of ${validId.itemDisplayName}"}]}`);
                }
            }
        }
    }
}

// Count the number of a specific item in an inventory
function getItemAmount(inventory, itemId) {
    let amount = 0;
    for (let i = 0; i < inventory.size; i++) {
        const item = inventory.getItem(i);
        if (item && item.typeId === itemId) {
            amount += item.amount;
        }
    }
    return amount;
}

// Periodic sell UI execution
system.runInterval(() => {
    sellUI();
}, 1);
