::a <- {
	"das": Constants.ETFTeam.TF_TEAM_RED,
	[MOVETYPE_NONE]= 1.e3,
	d = "ewqhi"

	func = function() {
		while (null) break;
	}

	lambda = @() (a ? "312" : TF_COND_ZOOMED)
}

class a.cdb extends a.abc {
	constructor() {
		local player = Entities.FindByClassname(null, "player")
		EntFireByHandle(player, "RunScriptCode", format(@"
			self.SetHealth(" + 1 + @");
			self.SetMaxHealth(%.2f);
			printl(`dsaijdw`)
			EntFireByHandle(self, `RunScriptCode`, `printl(1)`, 0, null, null)
		", a[Constants.EMoveType.MOVETYPE_NONE]), 1, null, null)

		EntFire(activator, "CallScriptFunction", "PostPost")
		EntFire(caller, "CallScriptFunction", "Post.Post")
	}
}


ent.AcceptInput



















