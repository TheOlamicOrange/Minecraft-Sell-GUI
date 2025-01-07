import { world } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";
import { validIds, validPlayers, owner, saveValidPlayers } from "./main";

// Save valid IDs to storage
function saveValidIds() {
    world.setDynamicProperty(DYNAMIC_PROPERTY_KEY, JSON.stringify(Object.fromEntries(validIds)));
    return true;
}

// Constants
const ERROR_PREFIX = "<Sell GUI BP>";
import { DYNAMIC_PROPERTY_KEY, SELL_ID_OBJECTIVE } from "./main"

// Utility: Validate positive integer input
function validatePositiveInteger(value, fieldName, player) {
    if (!/^\d+$/.test(value) || parseInt(value) < 0) {
        player.runCommandAsync(
            `/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Please enter a positive integer for ${fieldName}."}]}`
        );
        return null;
    }
    return parseInt(value);
}

// Display sell settings menu
export function sellSettings(player) {
    if (validPlayers.indexOf(player.id) !== -1) {
        const form = new ActionFormData()
        form.title("Sell GUI Settings");
        form.button("Create New Sell ID");
        form.button("Edit Existing Sell ID");
        form.button("Delete Existing Sell ID");
        if (player.id === owner) {
            form.button("Sell Settings Permissions");
        }
        form.show(player).then(r => {
            if (r.canceled) return;
            if (r.selection === 0) newSellId(player);
            if (r.selection === 1) editSellId(player);
            if (r.selection === 2) deleteSellId(player);
            if (player.id === owner) {
                if (r.selection === 3) editSettingsPermissions(player);
            }
        });
    }
}

// Create a new sell ID
function newSellId(player) {
    const scoreboards = world.scoreboard.getObjectives().filter(obj => obj.id !== SELL_ID_OBJECTIVE);

    if (scoreboards.length === 0) {
        return player.runCommandAsync(
            `/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Please define a scoreboard for currency."}]}`
        );
    }

    const form = new ModalFormData();
    form.title("Create New ID");
    form.textField("Score ID", "Enter a positive integer");
    form.textField("Item ID\nEx: minecraft:dirt, modpack:custom_item", "namespace:item", "minecraft:");
    form.textField("Custom Display Name\nEx: Dirt, Custom Item", "");
    form.textField("Item Sell Value", "Enter a positive integer");
    form.dropdown("Currency Scoreboard", scoreboards.map(sb => sb.id));

    form.show(player).then(r => {
        if (r.canceled) return;

        let [scoreId, itemId, itemDisplayName, value, scoreboardIndex] = r.formValues;

        scoreId = validatePositiveInteger(scoreId, "Score ID", player);
        value = validatePositiveInteger(value, "Item Sell Value", player);
        if (scoreId === null || value === null) return;

        const newValidId = {
            itemId,
            itemDisplayName,
            value,
            scoreboard: scoreboards[scoreboardIndex].id
        };

        if (validIds.has(String(scoreId))) {
            return player.runCommandAsync(
                `/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Score ID already assigned to ${validIds.get(
                    String(scoreId)
                ).itemId}."}]}`
            );
        }

        validIds.set(String(scoreId), newValidId);
        saveValidIds();

        player.runCommandAsync(`/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Successfully created Sell ID for: ${itemId}"}]}`);
    });
}

// Edit an existing sell ID
function editSellId(player) {
    if (validIds.size === 0) {
        return player.runCommandAsync(
            `/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Nothing exists to edit."}]}`
        );
    }

    const scoreboards = world.scoreboard.getObjectives().filter(obj => obj.id !== SELL_ID_OBJECTIVE);
    if (scoreboards.length === 0) {
        return player.runCommandAsync(
            `/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Please define a scoreboard for currency."}]}`
        );
    }

    const validItems = Array.from(validIds.entries());
    const form = new ModalFormData()
    form.title("(Edit) Select Entry")
    form.dropdown("Select From Item Display Name", validItems.map(([key, value]) => value.itemDisplayName));

    form.show(player).then(r => {
        if (r.canceled) return;

        const selectedIndex = r.formValues[0];
        const [selectedKey, selectedValue] = validItems[selectedIndex];
        const initialScoreboardIndex = scoreboards.findIndex(sb => sb.id === selectedValue.scoreboard) || 0;

        const editForm = new ModalFormData();
        editForm.title(`Editing: ${selectedValue.itemDisplayName}`);
        editForm.textField("Score ID", "Enter a positive integer", selectedKey);
        editForm.textField("Item ID\nEx: minecraft:dirt, modpack:custom_item", "namespace:item", selectedValue.itemId);
        editForm.textField("Custom Display Name\nEx: Dirt, Custom Item", "", selectedValue.itemDisplayName)
        editForm.textField("Item Sell Value", "Enter a positive integer", String(selectedValue.value));
        editForm.dropdown("Currency Scoreboard", scoreboards.map(sb => sb.id), initialScoreboardIndex);

        editForm.show(player).then(editR => {
            if (editR.canceled) return;

            let [newScoreId, newItemId, newitemDisplayName, newValue, newScoreboardIndex] = editR.formValues;

            newScoreId = validatePositiveInteger(newScoreId, "Score ID", player);
            newValue = validatePositiveInteger(newValue, "Item Sell Value", player);
            if (newScoreId === null || newValue === null) return;

            if (validIds.has(String(newScoreId)) && String(newScoreId) !== selectedKey) {
                return player.runCommandAsync(
                    `/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Score ID already assigned to ${validIds.get(
                    String(newScoreId)
                ).itemId}."}]}`
                );
            }

            validIds.delete(selectedKey);
            validIds.set(String(newScoreId), {
                itemId: newItemId,
                itemDisplayName: newitemDisplayName,
                value: newValue,
                scoreboard: scoreboards[newScoreboardIndex].id
            });

            saveValidIds();
            player.runCommandAsync(`/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Successfully edited Sell ID for: ${selectedValue.itemDisplayName}"}]}`);
        });
    });
}

// Delete an existing sell ID (to be implemented)
function deleteSellId(player) {
    if (validIds.size === 0) {
        return player.runCommandAsync(
            `/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Nothing exists to delete."}]}`
        );
    }

    const scoreboards = world.scoreboard.getObjectives().filter(obj => obj.id !== SELL_ID_OBJECTIVE);
    if (scoreboards.length === 0) {
        return player.runCommandAsync(
            `/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Please define a scoreboard for currency."}]}`
        );
    }

    const validItems = Array.from(validIds.entries());
    const form = new ModalFormData();
    form.dropdown("Select From Item ID", validItems.map(([key, value]) => value.itemId));

    form.show(player).then(r => {
        if (r.canceled) return;

        const selectedIndex = r.formValues[0];
        const [selectedKey, selectedValue] = validItems[selectedIndex];
        
        const confirmForm = new ActionFormData();
        confirmForm.title("Confirm Deletion");
        confirmForm.button("Confirm");
        confirmForm.show(player).then(confirmR => {
            if (confirmR.canceled) return;
            if (confirmR.selection === 0) {
                validIds.delete(selectedKey);
                saveValidIds();
                player.runCommandAsync(`/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} Successfully deleted Sell ID for: ${selectedValue.itemDisplayName}"}]}`);
            }
        });
    });
}

function editSettingsPermissions(player) {
    const form = new ActionFormData();
    form.title("Edit Sell Settings Permissions");
    form.button("Add Permission");
    form.button("Remove Permission");
    form.show(player).then(r => {
        if (r.canceled) return;
        if (r.selection === 0) {
            const players = world.getAllPlayers().filter(p => validPlayers.indexOf(p.id) === -1);
            if (players.length === 0) {
                return player.runCommandAsync(`/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} All players in world have permission"}]}`);
            }
            const addForm = new ModalFormData();
            addForm.title("Add Sell Gui Permission");
            addForm.dropdown("Select player to give permission", players.map(p => p.nameTag));
            addForm.show(player).then(addR => {
                if (addR.canceled) return;
                validPlayers.push(players[addR.formValues[0]].id);
                saveValidPlayers();
                return;
            });
        }
        if (r.selection === 1) {
            const players = world.getAllPlayers().filter(p => validPlayers.indexOf(p.id) !== -1 && owner !== p.id);
            if (players.length === 0) {
                return player.runCommandAsync(`/tellraw @s {"rawtext":[{"text":"${ERROR_PREFIX} No players in world have permission"}]}`);
            }
            const removeForm = new ModalFormData();
            removeForm.title("Remove Sell Gui Permission");
            removeForm.dropdown("Select player to remove permission", players.map(p => p.nameTag));
            removeForm.show(player).then(removeR => {
                if (removeR.canceled) return;
                validPlayers.splice(validPlayers.indexOf(players[removeR.formValues[0]]), 1);
                saveValidPlayers();
                return;
            });
        }
    });
}