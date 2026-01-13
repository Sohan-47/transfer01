class ScenarioEditor {
    static init(game) {
        this.game = game;
        this.ui = null;
        this.isVisible = false;
        this.selectedRegionId = null;
        this.injectUI();
        this.updateInterval = null;
    }

    static injectUI() {
        const div = document.createElement('div');
        div.id = 'scenario-editor-panel';
        div.style.position = 'fixed';
        div.style.top = '50px';
        div.style.right = '50px';
        div.style.width = '300px';
        div.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        div.style.color = '#fff';
        div.style.padding = '15px';
        div.style.zIndex = '10000';
        div.style.border = '2px solid #8b4513';
        div.style.borderRadius = '8px';
        div.style.fontFamily = 'monospace';
        div.style.display = 'none';

        div.innerHTML = `
            <h3 style="margin-top:0; color:#FFA500; border-bottom:1px solid #555; padding-bottom:5px;">🛠️ SCENARIO EDITOR</h3>
            
            <div style="margin-bottom: 15px;">
                <h4 style="color:#aaa; margin:5px 0;">GAME STATE</h4>
                <button onclick="ScenarioEditor.forceTurn()" style="width:100%; cursor:pointer; padding:5px; background:#444; color:white; border:1px solid #666;">Force Next Turn ⏭️</button>
            </div>

            <div style="margin-bottom: 15px;">
                <h4 style="color:#aaa; margin:5px 0;">PLAYER RESOURCES</h4>
                <div style="display:flex; gap:5px; margin-bottom:5px;">
                    <select id="sc-player-select" style="flex:1;" onchange="ScenarioEditor.refreshPlayerUI()">
                        <option value="1">Player 1 (Blue)</option>
                        <option value="2">Player 2 (Red)</option>
                    </select>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:5px;">
                    <button onclick="ScenarioEditor.addRes('money', 1000)">+$1000 Map</button>
                    <button onclick="ScenarioEditor.addRes('oil', 500)">+500 Oil</button>
                    <button onclick="ScenarioEditor.resetCooldowns()">Reset Cooldowns</button>
                    <button onclick="ScenarioEditor.maxMorale()">Max Morale</button>
                </div>
            </div>

            <div id="sc-region-editor" style="border-top:1px solid #555; paddingTop:5px;">
                <h4 style="color:#aaa; margin:5px 0;">SELECTED REGION</h4>
                <div id="sc-no-region" style="color:#666; font-style:italic;">Select a region on map...</div>
                <div id="sc-region-controls" style="display:none;">
                    <div style="margin-bottom:5px;">
                        <label>Owner:</label>
                        <select id="sc-reg-owner" onchange="ScenarioEditor.setOwner()">
                            <option value="null">Neutral</option>
                            <option value="1">Player 1</option>
                            <option value="2">Player 2</option>
                        </select>
                    </div>
                    <div style="margin-bottom:5px;">
                        <label>Troops:</label>
                        <input type="number" id="sc-reg-troops" style="width:60px;" value="0">
                        <button onclick="ScenarioEditor.setTroops()">Set</button>
                    </div>
                    <div>
                        <label>Buildings:</label>
                        <div id="sc-buildings-list" style="display:flex; flex-wrap:wrap; gap:5px; margin-top:5px;">
                            <!-- Injected checkboxes -->
                        </div>
                    </div>
                </div>
            </div>
            
            <button onclick="ScenarioEditor.toggle()" style="position:absolute; top:5px; right:5px; background:none; border:none; color:white; cursor:pointer;">✖</button>
        `;

        document.body.appendChild(div);
        this.ui = div;
    }

    static toggle() {
        this.isVisible = !this.isVisible;
        this.ui.style.display = this.isVisible ? 'block' : 'none';

        if (this.isVisible) {
            this.updateInterval = setInterval(() => this.updateUI(), 500);
            this.updateUI();
        } else {
            clearInterval(this.updateInterval);
        }
    }

    static updateUI() {
        if (!this.game) return;

        // Update Region Info if changed
        if (this.game.renderer && this.game.renderer.selectedRegion !== this.selectedRegionId) {
            this.selectedRegionId = this.game.renderer.selectedRegion;
            this.refreshRegionUI();
        }
    }

    static refreshRegionUI() {
        const noReg = document.getElementById('sc-no-region');
        const controls = document.getElementById('sc-region-controls');

        if (this.selectedRegionId === null || this.selectedRegionId === undefined) {
            noReg.style.display = 'block';
            controls.style.display = 'none';
            return;
        }

        const r = this.game.map.regions[this.selectedRegionId];
        noReg.style.display = 'none';
        controls.style.display = 'block';

        // Update Inputs
        document.getElementById('sc-reg-owner').value = r.owner === null ? "null" : r.owner;
        document.getElementById('sc-reg-troops').value = r.troops;

        // Buildings
        const bList = document.getElementById('sc-buildings-list');
        bList.innerHTML = '';
        const types = [0, 1, 2, 3, 4]; // HQ, Camp, Armory, Art, Sniper
        const names = ["HQ", "Camp", "Armory", "Arty", "Sniper"];

        types.forEach(t => {
            const has = r.hasBuilding(t);
            const btn = document.createElement('button');
            btn.innerText = (has ? "✅ " : "❌ ") + names[t];
            btn.style.fontSize = "10px";
            btn.style.cursor = "pointer";
            btn.onclick = () => ScenarioEditor.toggleBuilding(t);
            bList.appendChild(btn);
        });
    }

    static forceTurn() {
        this.game.endTurn();
        // If MP host, force check?
        // Simple force for SP/Host
        console.log("Forced Turn End via Scenario Editor");
    }

    static addRes(type, amount) {
        const pid = parseInt(document.getElementById('sc-player-select').value);
        const p = this.game.players[pid];
        if (p) {
            if (type === 'money') p.resources.money += amount;
            if (type === 'oil') p.resources.oil += amount;
            updateUI(); // Main game UI update
        }
    }

    static resetCooldowns() {
        const pid = parseInt(document.getElementById('sc-player-select').value);
        const p = this.game.players[pid];
        if (p) {
            p.espionageCooldown = 0;
            if (this.game.hqMoveCooldown) this.game.hqMoveCooldown[pid] = 0;
            // Airstrike cooldown later
            console.log(`Reset cooldowns for P${pid}`);
        }
    }

    static maxMorale() {
        const pid = parseInt(document.getElementById('sc-player-select').value);
        if (this.game.players[pid]) {
            this.game.players[pid].morale = 100;
            updateUI();
        }
    }

    static setOwner() {
        if (this.selectedRegionId === null) return;
        const val = document.getElementById('sc-reg-owner').value;
        const r = this.game.map.regions[this.selectedRegionId];
        r.owner = val === "null" ? null : parseInt(val);
        // Clean buildings if neutral?
        if (r.owner === null) r.buildings = [];
        this.game.renderer.draw(); // Redraw map colors
    }

    static setTroops() {
        if (this.selectedRegionId === null) return;
        const val = parseInt(document.getElementById('sc-reg-troops').value);
        const r = this.game.map.regions[this.selectedRegionId];
        r.troops = val;
        this.game.renderer.draw();
        updateUI(); // Update side panel
    }

    static toggleBuilding(type) {
        if (this.selectedRegionId === null) return;
        const r = this.game.map.regions[this.selectedRegionId];
        if (r.owner === null) {
            alert("Cannot add buildings to neutral region!");
            return;
        }

        if (r.hasBuilding(type)) {
            // Remove
            r.buildings = r.buildings.filter(b => b.type !== type);
        } else {
            // Add
            // Assuming Building class available globally via cervaeu.html context
            // We need to access Building class. Since this script runs in same window, 
            // classes defined in cervaeu.html should be available if script loaded after?
            // Actually, we inject this script BEFORE main script, classes not defined yet.
            // BUT init() is called after game start.
            r.buildings.push(new Building(type));
        }
        this.refreshRegionUI();
        updateUI();
    }
}
