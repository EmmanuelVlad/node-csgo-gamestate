import http from 'http';
import { EventEmitter } from 'events';

class Weapon {

	constructor (data) {
		this.code = data.name;
		this.name = Weapon.codeToName(data.name);
		this.paintkit = data.paintkit;
		this.type = data.type;
		this.ammo_clip = data.ammo_clip;
		this.ammo_clip_max = data.ammo_clip_max;
		this.ammo_reserve = data.ammo_reserve;
		this.state = data.state;
	}

	static codeToName(code) {
		return this.list[code] || "unknown";
	}

	hasSkin() { 
		return this.paintkit !== "default";
	}

	isGrenade() {
		return this.type === "Grenade";
	}

	isPistol() {
		return this.type === "Pistol";
	}

	isRifle() {
		return this.type === "Rifle";
	}
}

Weapon.list = {
	// Rifles
	"weapon_m4a1": "M4A4",
	"weapon_m4a1_silencer": "M4A1-S",
	"weapon_ak47": "AK47",
	"weapon_aug": "AUG",
	"weapon_awp": "AWP",
	"weapon_famas": "Famas",
	"weapon_gs3sg1": "GS3SG1",
	"weapon_galilar": "Galil",
	"weapon_scar20": "Scar-20",
	"weapon_sg556": "SG-556",
	"weapon_ssg08": "Scout",
	"weapon_hkp2000": "P2000",
	// SMGs
	"weapon_bizon": "PP-Bizon",
	"weapon_mac10": "Mac-10",
	"weapon_mp7": "MP7",
	"weapon_mp9": "MP9",
	"weapon_p90": "P90",
	"weapon_ump45": "UMP-45",
	"weapon_mp5sd": "MP5-SD",
	// Heavy
	"weapon_m249": "M249",
	"weapon_mag7": "Mag7",
	"weapon_negev": "Negev",
	"weapon_nova": "Nova",
	"weapon_sawedoff": "Sawed-off",
	"weapon_xm1014": "XM1014",
	// Pistols
	"weapon_usp_silencer": "USP-S",
	"weapon_deagle": "Desert Eagle",
	"weapon_elite": "Dual Berettas",
	"weapon_fiveseven": "Fiveseven",
	"weapon_glock": "Glock-18",
	"weapon_hkp2000": "P2000",
	"weapon_p250": "P250",
	"weapon_tec9": "Tec-9",
	"weapon_cz75a": "CZ75-Auto",
	"weapon_revolver": "R8 Revolver",
	// Grenades
	"weapon_flashbang": "Flashbang",
	"weapon_decoy": "Decoy",
	"weapon_hegrenade": "HE Grenade",
	"weapon_incgrenade": "Incendiary Grenade",
	"weapon_molotov": "Molotov",
	"weapon_smokegrenade": "Smoke",
	"weapon_tagrenade": "Tactical Awereness Grenade",
	"weapon_healthshot": "Medi-Shot",
	// Knives
	"weapon_knife_ct": "Default CT knife",
	"weapon_knife_t": "Default T knife",
	"weapon_bayonet": "Bayonet",
	"weapon_knife_flip": "Flip knife",
	"weapon_knife_gut": "Gut knife",
	"weapon_knife_karambit": "Karambit",
	"weapon_knife_m9_bayonet": "M9 Bayonet",
	"weapon_knife_tactical": "Huntsman knife",
	"weapon_knife_butterfly": "Butterfly knife",
	"weapon_knife_push": "Shadow daggers",
	"weapon_knife_falchion": "Falchion",
	"weapon_knifegg": "Golden knife",
	"weapon_knife_survival_bowie": "Bowie knife",
	"weapon_knife_ursus": "Ursus",
	"weapon_knife_gypsy_jackknife": "Navaja",
	"weapon_knife_stiletto": "Stiletto",
	"weapon_knife_widowmaker": "Talon",
	// Other
	"weapon_c4": "C4",
	"weapon_taser": "Zeus",
	"weapon_breachcharge": "Breach charge",
	"weapon_snowball": "Snowball",
	"weapon_axe": "Axe",
	"weapon_hammer": "Hammer",
	"weapon_spanner": "Spanner",
	"weapon_tablet": "Tablet",
};

class Player extends EventEmitter {
	constructor() {
		super();
		this._current = {};
		this._old = {};

		// Accessible vars
		this.isBurning = false;
		this.isDead = false;
		this.activeWeapon = {};
	}

	eventManager(current, old) {
		// Setting current and old.
		this._current = current;
		this._old = old;

		// Checking activity
		switch (this._current.activity) {
			// Menu browsing
			case "menu":
				break;
			// In game
			default:
				// If the player is in free spec
				if (!this._current.team) return;
				this.deathEvent();
				this.burningEvent();
				this.weaponEvents();
				break;
		}
	}

	burningEvent() {
		if (this.isBurning = this._current.state.burning === 255 && !this.isDead) {
			this.emit("burning", this._current.state.health);
		}
	}

	deathEvent() {
		if ((this.isDead = this._current.state.health === 0) && this._old.state.health > 0) {
			this.emit("death");
		}
	}

	weaponEvents() {
		const findActive = (weapons) => Object.entries(weapons).find(w => w[1].state === "active" || w[1].state === "reloading");

		const weapons = this._current.weapons;
		const oldWeapons = this._old.weapons || {};

		const active = findActive(weapons);
		const oldActive = findActive(oldWeapons);

		// Throwing grenade
		if (active[1] && active[1].type === "Grenade" &&
				oldActive[1] && oldActive[1].type === "Grenade" &&
				active[1].ammo_reserve < oldActive[1].ammo_reserve) {
			this.emit("grenadeThrow", new Weapon(active[1]));
		}
		// Pick up
		else if (Object.keys(weapons).length > Object.keys(oldWeapons).length) {
			// TODO: send the weapon wich was picked up
			this.emit("weaponPickedUp");
		}
		// Drop
		else if (oldActive[0] && oldActive[1].type !== "Grenade" &&
				(!weapons[oldActive[0]] || weapons[oldActive[0]].name !== oldWeapons[oldActive[0]].name)) {
			this.emit("weaponDrop", new Weapon(oldActive[1]));
		}
		// Reload
		else if (active[1].state === "reloading" && oldActive[1].state !== "reloading") {
			this.emit("weaponReload", new Weapon(active[1]));
		}
		// Shoot
		else if ((active[1].name === oldActive[1].name) && active[1].ammo_clip < oldActive[1].ammo_clip) {
			this.emit("weaponShoot", new Weapon(active[1]));
		}
		// Switch
		else if (active[1].name !== oldActive[1].name) {
			this.emit("weaponSwitch", new Weapon(active[1]));
		}
	}
	// spawnEvent()
}

class CSGOClient extends EventEmitter {

	constructor(host = "127.0.0.1", port = 3000) {
		super();
		this._host = host;
		this._port = port;
		this._server = this.newServer();
		this._old = {};
		this.player = new Player();
	}

	newServer() {
		return http.createServer((req, res) => {

			if (req.method == "POST") {
				res.writeHead(200, {"Content-Type": "text/html"});
		
				let body = "";
				req.on("data", data => {
					body += data;
				});
				req.on("end", () => {
					this.dispatchEvents(JSON.parse(body));
					res.end("");
				});
			} else {
				res.writeHead(200, {"Content-Type": "text/html"});
				res.end("<html><body>HTTP Server at http://" + this._host + ":" + this._port + "</body></html>");
			}
		
		});
	}

	start() {
		this._server.listen(this._port, this._host);
		console.log('Listening at http://' + this._host + ':' + this._port);
		return this;
	}

	dispatchEvents(data) {
		if (this._old.player) {
			this.player.eventManager(data.player, this._old.player);
		}
		this._old = data;
	}

}

export default CSGOClient;
