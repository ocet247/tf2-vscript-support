import { BackwardIterator } from "./textProcessing";


export interface Doc {
	signature: string,
	description?: string | { [line: string]: boolean };
}

export interface Docs {
	[name: string]: Doc
}

export interface InstancesDocs {
	[instance_name: string]: Docs
}

// JS will otherwise find prototype methods like "constructor" and return it as a function
export function safeLookup<T>(obj: Record<string, T>, key: string): T | undefined {
	return Object.hasOwn(obj, key) ? obj[key] : undefined;
}

export function findDoc(name: string, a: string): Doc | undefined {
	// Js programming at it's finest
	let entry: Doc | undefined = 
		safeLookup(allFunctions, name) ??
		safeLookup(allMethods, name) ??
		safeLookup(allDeprecatedFunctions, name) ??
		safeLookup(allDeprecatedMethods, name) ??
		safeLookup(builtInConstants, name) ??
		safeLookup(builtInVariables, name) ??
		safeLookup(builtInEnums, name);

	if (entry) {
		return entry;
	}

	for (const instance of Object.values(instancesMethods)) {
		entry = safeLookup(instance, name);
		if (entry) {
			return entry;
		}
	}

	for (const instance of Object.values(enumMembers)) {
		entry = safeLookup(instance, name);
		if (entry) {
			return entry;
		}
	}

	return undefined;
}

export function findMethod(name: string): Doc | undefined {
	// yes js does lookup prototype methods on objects that were meant to be maps
	let entry: Doc | undefined = 
		safeLookup(allFunctions, name) ??
		safeLookup(allMethods, name) ??
		safeLookup(allDeprecatedFunctions, name) ??
		safeLookup(allDeprecatedMethods, name);
	
	if (entry) {
		return entry;
	}

	for (const method of Object.values(instancesMethods)) {
		entry = safeLookup(method, name);
		if (entry) {
			return entry;
		}
	}
	
	return undefined;
}

export const keywords: string[] = [
	"base",
	"break",
	"case",
	"catch",
	"class",
	"clone",
	"constructor",
	"continue",
	"const",
	"default",
	"delete",
	"do",
	"else",
	"enum",
	"extends",
	"false",
	"for",
	"foreach",
	"function",
	"if",
	"in",
	"instanceof",
	"local",
	"null",
	"resume",
	"return",
	"static",
	"switch",
	"this",
	"throw",
	"true",
	"try",
	"typeof",
	"while",
	"yield"
];

export const allMethods: Docs = {
	/* --------------------------- *
	 * CBaseEntity                 *
	 * --------------------------- */
	AcceptInput: {
		signature: "CBaseEntity.AcceptInput(input: string, param: string, activator: handle, caller: handle) -> bool",
		description: "Generate a synchronous I/O event. Unlike `EntFireByHandle`, this is processed immediately. Returns false if `input` is a null/empty string, or if the input wasn't handled."
	},
	AddEFlags: {
		signature: "CBaseEntity.AddEFlags(flags: FEntityEFlags) -> null",
		description: "Adds the supplied `flags` to the **Entity Flags** in the entity. *(m_iEFlags datamap)*\n\nSee [FEntityEFlags](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FEntityEFlags)."
	},
	AddFlag: {
		signature: "CBaseEntity.AddFlag(flags: FPlayer) -> null",
		description: "Adds the supplied `flags` to another separate player-related entity flags system in the entity. *(m_fFlags datamap)*\n\nSee [FPlayer](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FPlayer)."
	},
	AddSolidFlags: {
		signature: "CBaseEntity.AddSolidFlags(flags: FSolid) -> null",
		description: "Adds the supplied `flags` to the *Solid Flags* in the entity. *(m_Collision.m_usSolidFlags datamap)*\n\nSee [FSolid](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FSolid)."
	},
	ApplyAbsVelocityImpulse: {
		signature: "CBaseEntity.ApplyAbsVelocityImpulse(impulse: Vector) -> null",
		description: "Apply a Velocity Impulse as a world space impulse vector. Works for most physics-based objects including dropped weapons and even dropped Sandviches."
	},
	ApplyLocalAngularVelocityImpulse: {
		signature: "CBaseEntity.ApplyLocalAngularVelocityImpulse(impulse: Vector) -> null",
		description: "Apply an Angular Velocity Impulse in entity local space. The direction of the input vector is the rotation axis, and the length is the magnitude of the impulse."
	},
	BecomeRagdollOnClient: {
		signature: "CBaseEntity.BecomeRagdollOnClient(impulse: Vector) -> bool",
		description: "Acts like the `BecomeRagdoll` input, with the required `impulse` value applied as a force on the ragdoll. Does NOT spawn a `[prop_ragdoll](https://developer.valvesoftware.com/wiki/prop_ragdoll)` or any other entity."
	},
	ClearFlags: {
		signature: "CBaseEntity.ClearFlags() -> null",
		description: "Sets the player-related entity flags to 0 on an entity, clearing them."
	},
	ClearSolidFlags: {
		signature: "CBaseEntity.ClearSolidFlags() -> null",
		description: "Sets *Solid Flags* to 0 on an entity, clearing them."
	},
	ConnectOutput: {
		signature: "CBaseEntity.ConnectOutput(output_name: string, function_name: string) -> null",
		description: "Adds an I/O connection that will call the named function when the specified output fires."
	},
	Destroy: {
		signature: "CBaseEntity.Destroy() -> null",
		description: "Removes the entity. Simply calls [UTIL_Remove](https://developer.valvesoftware.com/wiki/UTIL_Remove)."
	},
	DisableDraw: {
		signature: "CBaseEntity.DisableDraw() -> null",
		description: "Disable drawing and transmitting the entity to clients. *(adds EF_NODRAW)*"
	},
	DisconnectOutput: {
		signature: "CBaseEntity.DisconnectOutput(output_name: string, function_name: string) -> null",
		description: "Removes a connected script function from an I/O event."
	},
	DispatchSpawn: {
		signature: "CBaseEntity.DispatchSpawn() -> null",
		description: "Alternative dispatch spawn, same as the one in CEntities, for convenience."
	},
	EmitSound: {
		signature: "CBaseEntity.EmitSound(sound_name: string) -> null",
		description: "Plays a sound from this entity. The sound must be precached first for it to play (using `PrecacheSound` or `PrecacheScriptSound`)."
	},
	EnableDraw: {
		signature: "CBaseEntity.EnableDraw() -> null",
		description: "Enable drawing and transmitting the entity to clients. *(removes EF_NODRAW)*"
	},
	entindex: {
		signature: "CBaseEntity.entindex() -> int",
		description: "Returns the entity index."
	},
	EyeAngles: {
		signature: "CBaseEntity.EyeAngles() -> QAngle",
		description: "Returns the entity's eye angles. Acts like `GetAbsAngles` if the entity does not support it."
	},
	EyePosition: {
		signature: "CBaseEntity.EyePosition() -> Vector",
		description: "Get vector to eye position - absolute coords. Acts like `GetOrigin` if the entity does not support it."
	},
	FirstMoveChild: {
		signature: "CBaseEntity.FirstMoveChild() -> handle",
		description: "Returns the most-recent entity parented to this one."
	},
	GetAbsAngles: {
		signature: "CBaseEntity.GetAbsAngles() -> QAngle",
		description: "Get the entity's pitch, yaw, and roll as **QAngles**."
	},
	GetAbsVelocity: {
		signature: "CBaseEntity.GetAbsVelocity() -> Vector",
		description: "Returns the current absolute velocity of the entity."
	},
	GetAngularVelocity: {
		signature: "CBaseEntity.GetAngularVelocity() -> Vector",
		description: "Get the local angular velocity - returns a **Vector** of pitch, yaw, and roll."
	},
	GetBaseVelocity: {
		signature: "CBaseEntity.GetBaseVelocity() -> Vector",
		description: "Returns any constant velocity currently being imparted onto the entity. This includes being pushed by effects like"
	},
	GetBoundingMaxs: {
		signature: "CBaseEntity.GetBoundingMaxs() -> Vector",
		description: "Get a vector containing max bounds, centered on object."
	},
	GetBoundingMaxsOriented: {
		signature: "CBaseEntity.GetBoundingMaxsOriented() -> Vector",
		description: "Get a vector containing max bounds, centered on object, taking the object's orientation into account."
	},
	GetBoundingMins: {
		signature: "CBaseEntity.GetBoundingMins() -> Vector",
		description: "Get a vector containing min bounds, centered on object."
	},
	GetBoundingMinsOriented: {
		signature: "CBaseEntity.GetBoundingMinsOriented() -> Vector",
		description: "Get a vector containing min bounds, centered on object, taking the object's orientation into account."
	},
	GetCenter: {
		signature: "CBaseEntity/CTFNavArea.GetCenter() -> Vector",
		description: "Gets center point of the entity in world coordinates / Get center origin of area."
	},
	GetClassname: {
		signature: "CBaseEntity.GetClassname() -> string"
	},
	GetCollisionGroup: {
		signature: "CBaseEntity.GetCollisionGroup() -> int",
		description: "Gets the current collision group of the entity."
	},
	GetEFlags: {
		signature: "CBaseEntity.GetEFlags() -> int",
		description: "Get the entity's engine flags."
	},
	GetFlags: {
		signature: "CBaseEntity.GetFlags() -> int",
		description: "Get the entity's flags."
	},
	GetEntityHandle: {
		signature: "CBaseEntity.GetEntityHandle() -> ehandle",
		description: "Get the entity as an EHANDLE."
	},
	GetEntityIndex: {
		signature: "CBaseEntity.GetEntityIndex() -> int"
	},
	GetForwardVector: {
		signature: "CBaseEntity.GetForwardVector() -> Vector",
		description: "Get the forward vector of the entity."
	},
	GetFriction: {
		signature: "CBaseEntity.GetFriction() -> float",
		description: "Get PLAYER friction, ignored for objects."
	},
	GetGravity: {
		signature: "CBaseEntity.GetGravity() -> float"
	},
	GetHealth: {
		signature: "CBaseEntity.GetHealth() -> int"
	},
	GetLocalAngles: {
		signature: "CBaseEntity.GetLocalAngles() -> QAngle"
	},
	GetLocalOrigin: {
		signature: "CBaseEntity.GetLocalOrigin() -> Vector"
	},
	GetLocalVelocity: {
		signature: "CBaseEntity.GetLocalVelocity() -> Vector",
		description: "Get Entity relative velocity."
	},
	GetMaxHealth: {
		signature: "CBaseEntity.GetMaxHealth() -> int"
	},
	GetModelKeyValues: {
		signature: "CBaseEntity.GetModelKeyValues() -> handle",
		description: "Get a KeyValue class instance on this entity's model."
	},
	GetModelName: {
		signature: "CBaseEntity.GetModelName() -> string",
		description: "Returns the name of the model."
	},
	GetMoveParent: {
		signature: "CBaseEntity.GetMoveParent() -> handle",
		description: "If in hierarchy, retrieves the entity's parent."
	},
	GetMoveType: {
		signature: "CBaseEntity.GetMoveType() -> int"
	},
	GetName: {
		signature: "CBaseEntity/CBaseCombatWeapon.GetName() -> string",
		description: "Get entity's targetname/Gets the weapon's internal name."
	},
	GetOrigin: {
		signature: "CBaseEntity.GetOrigin() -> Vector",
		description: "This is `GetAbsOrigin` with a funny script name for some reason. Not changing it for legacy compat though."
	},
	GetOwner: {
		signature: "CBaseEntity.GetOwner() -> handle",
		description: "Gets this entity's owner."
	},
	GetPhysAngularVelocity: {
		signature: "CBaseEntity.GetPhysAngularVelocity() -> Vector"
	},
	GetPhysVelocity: {
		signature: "CBaseEntity.GetPhysVelocity() -> Vector"
	},
	GetPreTemplateName: {
		signature: "CBaseEntity.GetPreTemplateName() -> string",
		description: "Get the entity name stripped of template unique decoration."
	},
	GetRightVector: {
		signature: "CBaseEntity.GetRightVector() -> Vector",
		description: "Get the right vector of the entity."
	},
	GetRootMoveParent: {
		signature: "CBaseEntity.GetRootMoveParent() -> handle",
		description: "If in hierarchy, walks up the hierarchy to find the root parent."
	},
	GetScriptId: {
		signature: "CBaseEntity.GetScriptId() -> string",
		description: "Retrieve the unique identifier used to refer to the entity within the scripting system."
	},
	GetScriptScope: {
		signature: "CBaseEntity.GetScriptScope() -> handle",
		description: "Retrieve the script-side data associated with an entity."
	},
	GetScriptThinkFunc: {
		signature: "CBaseEntity.GetScriptThinkFunc() -> string",
		description: "Retrieve the name of the current script think func."
	},
	GetSolid: {
		signature: "CBaseEntity.GetSolid() -> int",
		description: "See [ESolidType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ESolidType)."
	},
	GetSoundDuration: {
		signature: "CBaseEntity.GetSoundDuration(sound_name: string, actor_model_name: string) -> float",
		description: "Returns float duration of the sound. Actor model name is optional and can be left null."
	},
	GetTeam: {
		signature: "CBaseEntity.GetTeam() -> int",
		description: "See [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
	},
	GetUpVector: {
		signature: "CBaseEntity.GetUpVector() -> Vector",
		description: "Get the up vector of the entity."
	},
	GetWaterLevel: {
		signature: "CBaseEntity.GetWaterLevel() -> int",
		description: "This function tells you how much of the entity is underwater. It returns a value of 0 if not underwater, 1 if the feet are (touching water brush), 2 if the waist is (center of the hull of the entity), and 3 if the head is (eyes position)."
	},
	GetWaterType: {
		signature: "CBaseEntity.GetWaterType() -> int",
		description: "It returns the type of water the entity is currently submerged in. 32 for water and 16 for slime."
	},
	IsAlive: {
		signature: "CBaseEntity.IsAlive() -> bool",
		description: "Am I alive?"
	},
	IsEFlagSet: {
		signature: "CBaseEntity.IsEFlagSet(flag: FEntityEFlags) -> bool",
		description: "See [FEntityEFlags](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FEntityEFlags)."
	},
	IsPlayer: {
		signature: "CBaseEntity.IsPlayer() -> bool",
		description: "Checks whether the entity is a player or not."
	},
	IsSolid: {
		signature: "CBaseEntity.IsSolid() -> bool"
	},
	IsSolidFlagSet: {
		signature: "CBaseEntity.IsSolidFlagSet(flag: FSolid) -> bool",
		description: "See [FSolid](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FSolid)."
	},
	IsValid: {
		signature: "CBaseEntity.IsValid() -> bool",
		description: "Checks whether the entity still exists. Useful when storing entity handles and needing to check if the entity was not deleted."
	},
	KeyValueFromFloat: {
		signature: "CBaseEntity.KeyValueFromFloat(key: string, value: float) -> bool",
		description: "Executes KeyValue with a float."
	},
	KeyValueFromInt: {
		signature: "CBaseEntity.KeyValueFromInt(key: string, value: int) -> bool",
		description: "Executes KeyValue with an int."
	},
	KeyValueFromString: {
		signature: "CBaseEntity.KeyValueFromString(key: string, value: string) -> bool",
		description: "Executes KeyValue with a string."
	},
	KeyValueFromVector: {
		signature: "CBaseEntity.KeyValueFromVector(key: string, value: Vector) -> bool",
		description: "Executes KeyValue with a vector."
	},
	Kill: {
		signature: "CBaseEntity.Kill() -> null",
		description: "Removes the entity. Equivalent of firing the `Kill` I/O input, but instantaneous."
	},
	LocalEyeAngles: {
		signature: "CBaseEntity.LocalEyeAngles() -> handle",
		description: "Returns the entity's local eye angles."
	},
	NextMovePeer: {
		signature: "CBaseEntity.NextMovePeer() -> handle",
		description: "Returns the next entity parented *with* the entity. Intended for iteration use with `FirstMoveChild()`."
	},
	PrecacheModel: {
		signature: "CBaseEntity.PrecacheModel(model_name: string) -> null",
		description: "Precache a model (`.mdl`) or sprite (`.vmt`). The extension must be specified."
	},
	PrecacheScriptSound: {
		signature: "CBaseEntity.PrecacheScriptSound(sound_script: string) -> null",
		description: "Precache a sound script. Same as `PrecacheSoundScript`."
	},
	PrecacheSoundScript: {
		signature: "CBaseEntity.PrecacheSoundScript(sound_script: string) -> null",
		description: "Precache a sound script. Same as `PrecacheScriptSound`."
	},
	RemoveEFlags: {
		signature: "CBaseEntity.RemoveEFlags(flags: FEntityEFlags) -> null",
		description: "See [FEntityEFlags](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FEntityEFlags)."
	},
	RemoveFlag: {
		signature: "CBaseEntity.RemoveFlag(flags: FPlayer) -> null",
		description: "See [FPlayer](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FPlayer)."
	},
	RemoveSolidFlags: {
		signature: "CBaseEntity.RemoveSolidFlags(flags: FSolid) -> null",
		description: "See [FSolid](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FSolid)."
	},
	SetAbsAngles: {
		signature: "CBaseEntity.SetAbsAngles(angles: QAngle) -> null",
		description: "Set entity pitch, yaw, roll as QAngles. Does not work on players, use `SnapEyeAngles` instead."
	},
	SetAbsVelocity: {
		signature: "CBaseEntity.SetAbsVelocity(velocity: Vector) -> null",
		description: "Sets the current absolute velocity of the entity. Does nothing on [VPhysics](https://developer.valvesoftware.com/wiki/VPhysics) objects (such as `prop_physics`). For those, use `SetPhysVelocity` instead."
	},
	SetAbsOrigin: {
		signature: "CBaseEntity.SetAbsOrigin(origin: Vector) -> null",
		description: "Sets the absolute origin of the entity."
	},
	SetAngularVelocity: {
		signature: "CBaseEntity.SetAngularVelocity(pitch: float, yaw: float, roll: float) -> null",
		description: "Set the local angular velocity."
	},
	SetCollisionGroup: {
		signature: "CBaseEntity.SetCollisionGroup(group: ECollisionGroup) -> null",
		description: "Set the current collision group of the entity.\n\nSee [ECollisionGroup](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ECollisionGroup)."
	},
	SetDrawEnabled: {
		signature: "CBaseEntity.SetDrawEnabled(toggle: bool) -> null",
		description: "Enables drawing if you pass true, disables drawing if you pass false."
	},
	SetEFlags: {
		signature: "CBaseEntity.SetEFlags(flags: FEntityEFlags) -> null",
		description: "See [FEntityEFlags](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FEntityEFlags)."
	},
	SetForwardVector: {
		signature: "CBaseEntity.SetForwardVector(forward: Vector) -> null",
		description: "Set the orientation of the entity to have this forward vector."
	},
	SetFriction: {
		signature: "CBaseEntity.SetFriction(friction: float) -> null"
	},
	SetGravity: {
		signature: "CBaseEntity.SetGravity(gravity: float) -> null",
		description: "Sets a multiplier for gravity. 1 is default gravity."
	},
	SetHealth: {
		signature: "CBaseEntity.SetHealth(health: int) -> null"
	},
	SetLocalAngles: {
		signature: "CBaseEntity.SetLocalAngles(angles: QAngle) -> null"
	},
	SetLocalOrigin: {
		signature: "CBaseEntity.SetLocalOrigin(origin: Vector) -> null"
	},
	SetMaxHealth: {
		signature: "CBaseEntity.SetMaxHealth(health: int) -> null",
		description: "Sets the maximum health this entity can have. Does not update the current health, so `SetHealth` should be used afterwards."
	},
	SetModel: {
		signature: "CBaseEntity.SetModel(model_name: string) -> null",
		description: "Set a model for this entity."
	},
	SetMoveType: {
		signature: "CBaseEntity.SetMoveType(movetype: EMoveType, movecollide: EMoveCollide) -> null",
		description: "See [EMoveType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#EMoveType) ,[EMoveCollide](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#EMoveCollide)."
	},
	SetOwner: {
		signature: "CBaseEntity.SetOwner(entity: handle) -> null",
		description: "Sets this entity's owner."
	},
	SetPhysAngularVelocity: {
		signature: "CBaseEntity.SetPhysAngularVelocity(angular_velocity: Vector) -> null"
	},
	SetPhysVelocity: {
		signature: "CBaseEntity.SetPhysVelocity(velocity: Vector) -> null"
	},
	SetSize: {
		signature: "CBaseEntity.SetSize(mins: Vector, maxs: Vector) -> null",
		description: "Sets the bounding box's scale for this entity."
	},
	SetSolid: {
		signature: "CBaseEntity.SetSolid(solid: ESolidType) -> null",
		description: "See [ESolidType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ESolidType)."
	},
	SetSolidFlags: {
		signature: "CBaseEntity.SetSolidFlags(flags: FSolid) -> null",
		description: "See [FSolid](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FSolid)."
	},
	SetTeam: {
		signature: "CBaseEntity.SetTeam(team: ETFTeam) -> null",
		description: "Sets entity team.\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
	},
	SetWaterLevel: {
		signature: "CBaseEntity.SetWaterLevel(water_level: int) -> null",
		description: "This sets how much of the entity is underwater. Setting it to 0 means it is not underwater, 1 if the feet are (touching water brush), 2 if the waist is (center of the hull of the entity), and 3 if the head is (eyes position)."
	},
	SetWaterType: {
		signature: "CBaseEntity.SetWaterType(water_type: int) -> null",
		description: "Set the type of water the entity is currently submerged in. Generic values to use are 32 for water and 16 for slime."
	},
	StopSound: {
		signature: "CBaseEntity.StopSound(sound_name: string) -> null",
		description: "Stops a sound on this entity."
	},
	TakeDamage: {
		signature: "CBaseEntity.TakeDamage(damage: float, damage_type: FDmgType, attacker: handle) -> null",
		description: "Deals damage to the entity.\n\nSee [FDmgType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FDmgType)."
	},
	TakeDamageEx: {
		signature: "CBaseEntity.TakeDamageEx(inflictor: handle, attacker: handle, weapon: handle, damage_force: Vector, damage_position: Vector, damage: float, damage_type: FDmgType) -> null",
		description: "Extended version of `TakeDamage`.\n\nSee [FDmgType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FDmgType)."
	},
	TakeDamageCustom: {
		signature: "CBaseEntity.TakeDamageCustom(inflictor: handle, attacker: handle, weapon: handle, damage_force: Vector, damage_position: Vector, damage: float, damage_type: FDmgType, custom_damage_type: ETFDmgCustom) -> null",
		description: "Extended version of `TakeDamageEx` that can apply a custom damage type.\n\nSee [FDmgType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FDmgType) ,[ETFDmgCustom](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFDmgCustom)."
	},
	Teleport: {
		signature: "CBaseEntity.Teleport(use_origin: bool, origin: Vector, use_angles: bool, angles: QAngle, use_velocity: bool, velocity: Vector) -> null",
		description: "Teleports this entity. For this function, set the bools to false if you want that entity's property unchanged. (do not use null arguments!)"
	},
	TerminateScriptScope: {
		signature: "CBaseEntity.TerminateScriptScope() -> null",
		description: "Clear the current script scope for this entity."
	},
	ToggleFlag: {
		signature: "CBaseEntity.ToggleFlag(flags: FPlayer) -> null",
		description: "See [FPlayer](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FPlayer)."
	},
	ValidateScriptScope: {
		signature: "CBaseEntity.ValidateScriptScope() -> bool",
		description: "Create a script scope for an entity if it doesn't already exist. The return value is always true, unless the script VM is disabled in launch options."
	},
	/* --------------------------- *
	 * CBaseAnimating              *
	 * --------------------------- */
	DispatchAnimEvents: {
		signature: "CBaseAnimating.DispatchAnimEvents(entity: handle) -> null",
		description: "Dispatch animation events to a CBaseAnimating entity."
	},
	FindBodygroupByName: {
		signature: "CBaseAnimating.FindBodygroupByName(name: string) -> int",
		description: "Find a bodygroup ID by name. Returns -1 if the bodygroup does not exist."
	},
	GetAttachmentAngles: {
		signature: "CBaseAnimating.GetAttachmentAngles(id: int) -> QAngle",
		description: "Get an attachment's angles as a QAngle, by ID."
	},
	GetAttachmentBone: {
		signature: "CBaseAnimating.GetAttachmentBone(id: int) -> int",
		description: "Get an attachment's parent bone index by ID."
	},
	GetAttachmentOrigin: {
		signature: "CBaseAnimating.GetAttachmentOrigin(id: int) -> Vector",
		description: "Get an attachment's origin as a Vector, by ID."
	},
	GetBodygroup: {
		signature: "CBaseAnimating.GetBodygroup(id: int) -> int",
		description: "Get the bodygroup value by bodygroup ID."
	},
	GetBodygroupName: {
		signature: "CBaseAnimating.GetBodygroupName(id: int) -> string",
		description: "Get the bodygroup's name by ID."
	},
	GetBodygroupPartName: {
		signature: "CBaseAnimating.GetBodygroupPartName(group: int, part: int) -> string",
		description: "Get the bodygroup's name by group and part."
	},
	GetBoneAngles: {
		signature: "CBaseAnimating.GetBoneAngles(id: int) -> QAngle",
		description: "Get the bone's angles as a QAngle, by ID."
	},
	GetBoneOrigin: {
		signature: "CBaseAnimating.GetBoneOrigin(id: int) -> Vector",
		description: "Get the bone's origin Vector by ID."
	},
	GetCycle: {
		signature: "CBaseAnimating.GetCycle() -> float",
		description: "Gets the model's current animation cycle rate. Ranges from 0.0 to 1.0."
	},
	GetModelScale: {
		signature: "CBaseAnimating.GetModelScale() -> float",
		description: "Get the model's scale."
	},
	GetPlaybackRate: {
		signature: "CBaseAnimating.GetPlaybackRate() -> float",
		description: "Get the current animation's playback rate."
	},
	GetSequence: {
		signature: "CBaseAnimating.GetSequence() -> int",
		description: "Get the current-playing sequence's ID."
	},
	GetSequenceActivityName: {
		signature: "CBaseAnimating.GetSequenceActivityName(id: int) -> string",
		description: "Get the activity name for a sequence by sequence ID."
	},
	GetSequenceDuration: {
		signature: "CBaseAnimating.GetSequenceDuration(id: int) -> float",
		description: "Get a sequence duration in seconds by sequence ID."
	},
	GetSequenceName: {
		signature: "CBaseAnimating.GetSequenceName(id: int) -> string",
		description: "Get a sequence name by sequence ID. Returns \"Not Found!\" if ID is -1, \"Unknown\" if the sequence doesn't exist or \"No model!\" if no model is assigned."
	},
	GetSkin: {
		signature: "CBaseAnimating.GetSkin() -> int",
		description: "Gets the current skin index."
	},
	IsSequenceFinished: {
		signature: "CBaseAnimating.IsSequenceFinished() -> bool",
		description: "Ask whether the main sequence is done playing."
	},
	LookupActivity: {
		signature: "CBaseAnimating.LookupActivity(activity: string) -> int",
		description: "Get the named activity index. Returns -1 if the activity does not exist."
	},
	LookupAttachment: {
		signature: "CBaseAnimating.LookupAttachment(name: string) -> int",
		description: "Get the named attachment index. Returns 0 if the attachment does not exist."
	},
	LookupBone: {
		signature: "CBaseAnimating.LookupBone(bone: string) -> int",
		description: "Get the named bone index. Returns -1 if the bone does not exist."
	},
	LookupPoseParameter: {
		signature: "CBaseAnimating.LookupPoseParameter(name: string) -> int",
		description: "Gets the pose parameter's index. Returns -1 if the pose parameter does not exist."
	},
	LookupSequence: {
		signature: "CBaseAnimating.LookupSequence(name: string) -> int",
		description: "Looks up a sequence by names of sequences or activities. Returns -1 if the sequence does not exist."
	},
	ResetSequence: {
		signature: "CBaseAnimating.ResetSequence(id: int) -> null",
		description: "Reset a sequence by sequence ID. If the ID is different than the current sequence, switch to the new sequence."
	},
	SetBodygroup: {
		signature: "CBaseAnimating.SetBodygroup(id: int, value: int) -> null",
		description: "Set the bodygroup by ID."
	},
	SetCycle: {
		signature: "CBaseAnimating.SetCycle(cycle: float) -> null",
		description: "Sets the model's current animation cycle from 0 to 1."
	},
	SetModelSimple: {
		signature: "CBaseAnimating.SetModelSimple(model_name: string) -> null",
		description: "Set a model for this entity. Matches easier behaviour of the SetModel input, automatically precaches, maintains sequence/cycle if possible. Also clears the bone cache."
	},
	SetModelScale: {
		signature: "CBaseAnimating.SetModelScale(scale: float, change_duration: float) -> null",
		description: "Changes a model's scale over time. Set the change duration to 0.0 to change the scale instantly."
	},
	SetPlaybackRate: {
		signature: "CBaseAnimating.SetPlaybackRate(rate: float) -> null",
		description: "Set the current animation's playback rate."
	},
	SetPoseParameter: {
		signature: "CBaseAnimating.SetPoseParameter(id: int, value: float) -> float",
		description: "Sets a pose parameter value. Returns the effective value after clamping or looping."
	},
	SetSequence: {
		signature: "CBaseAnimating.SetSequence(id: int) -> null",
		description: "Plays a sequence by sequence ID."
	},
	SetSkin: {
		signature: "CBaseAnimating.SetSkin(index: int) -> null",
		description: "Sets the model's skin."
	},
	StopAnimation: {
		signature: "CBaseAnimating.StopAnimation() -> null",
		description: "Stop the current animation (same as SetPlaybackRate 0.0)."
	},
	StudioFrameAdvance: {
		signature: "CBaseAnimating.StudioFrameAdvance() -> null",
		description: "Advance animation frame to some time in the future with an automatically calculated interval."
	},
	StudioFrameAdvanceManual: {
		signature: "CBaseAnimating.StudioFrameAdvanceManual(dt: float) -> null",
		description: "Advance animation frame to some time in the future with a manual interval."
	},
	/* --------------------------- *
	 * CBaseCombatWeapon           *
	 * --------------------------- */
	CanBeSelected: {
		signature: "CBaseCombatWeapon.CanBeSelected() -> bool",
		description: "Can this weapon be selected."
	},
	Clip1: {
		signature: "CBaseCombatWeapon.Clip1() -> int",
		description: "Current ammo in clip1."
	},
	Clip2: {
		signature: "CBaseCombatWeapon.Clip2() -> int",
		description: "Current ammo in clip2."
	},
	GetDefaultClip1: {
		signature: "CBaseCombatWeapon.GetDefaultClip1() -> int",
		description: "Default size of clip1."
	},
	GetDefaultClip2: {
		signature: "CBaseCombatWeapon.GetDefaultClip2() -> int",
		description: "Default size of clip2."
	},
	GetMaxClip1: {
		signature: "CBaseCombatWeapon.GetMaxClip1() -> int",
		description: "Max size of clip1."
	},
	GetMaxClip2: {
		signature: "CBaseCombatWeapon.GetMaxClip2() -> int",
		description: "Max size of clip2."
	}, /*
	GetName: {
		signature: "CBaseCombatWeapon.GetName() -> string",
		description: "Gets the weapon's internal name (not the targetname!)"
	},*/
	GetPosition: {
		signature: "CBaseCombatWeapon.GetPosition() -> int",
		description: "Gets the weapon's current position."
	},
	GetPrimaryAmmoCount: {
		signature: "CBaseCombatWeapon.GetPrimaryAmmoCount() -> int",
		description: "Current primary ammo count if no clip is used or to give a player if they pick up this weapon legacy style (not TF)."
	},
	GetPrimaryAmmoType: {
		signature: "CBaseCombatWeapon.GetPrimaryAmmoType() -> int",
		description: "Returns the primary ammo type."
	},
	GetPrintName: {
		signature: "CBaseCombatWeapon.GetPrintName() -> string",
		description: "Gets the weapon's print name."
	},
	GetSecondaryAmmoCount: {
		signature: "CBaseCombatWeapon.GetSecondaryAmmoCount() -> int",
		description: "Current secondary ammo count if no clip is used or to give a player if they pick up this weapon legacy style (not TF)."
	},
	GetSecondaryAmmoType: {
		signature: "CBaseCombatWeapon.GetSecondaryAmmoType() -> int",
		description: "Returns the secondary ammo type."
	},
	GetSlot: {
		signature: "CBaseCombatWeapon.GetSlot() -> int",
		description: "Gets the weapon's current slot."
	},
	GetSubType: {
		signature: "CBaseCombatWeapon.GetSubType() -> int",
		description: "Get the weapon subtype."
	},
	GetWeaponFlags: {
		signature: "CBaseCombatWeapon.GetWeaponFlags() -> int",
		description: "Get the weapon flags."
	},
	GetWeight: {
		signature: "CBaseCombatWeapon.GetWeight() -> int",
		description: "Get the weapon weighting/importance."
	},
	HasAnyAmmo: {
		signature: "CBaseCombatWeapon.HasAnyAmmo() -> bool",
		description: "Do we have any ammo?"
	},
	HasPrimaryAmmo: {
		signature: "CBaseCombatWeapon.HasPrimaryAmmo() -> bool",
		description: "Do we have any primary ammo?"
	},
	HasSecondaryAmmo: {
		signature: "CBaseCombatWeapon.HasSecondaryAmmo() -> bool",
		description: "Do we have any secondary ammo?"
	},
	IsAllowedToSwitch: {
		signature: "CBaseCombatWeapon.IsAllowedToSwitch() -> bool",
		description: "Are we allowed to switch to this weapon?"
	},
	IsMeleeWeapon: {
		signature: "CBaseCombatWeapon.IsMeleeWeapon() -> bool",
		description: "Returns whether this is a melee weapon."
	},
	PrimaryAttack: {
		signature: "CBaseCombatWeapon.PrimaryAttack() -> null",
		description: "Force a primary attack."
	},
	SecondaryAttack: {
		signature: "CBaseCombatWeapon.SecondaryAttack() -> null",
		description: "Force a secondary attack."
	},
	SetClip1: {
		signature: "CBaseCombatWeapon.SetClip1(amount: int) -> null",
		description: "Set current ammo in clip1."
	},
	SetClip2: {
		signature: "CBaseCombatWeapon.SetClip2(amount: int) -> null",
		description: "Set current ammo in clip2."
	},
	SetCustomViewModel: {
		signature: "CBaseCombatWeapon.SetCustomViewModel(model_name: string) -> null",
		description: "Sets a custom view model for this weapon by model name."
	},
	SetCustomViewModelModelIndex: {
		signature: "CBaseCombatWeapon.SetCustomViewModelModelIndex(model_index: int) -> null",
		description: "Sets a custom view model for this weapon by modelindex."
	},
	SetSubType: {
		signature: "CBaseCombatWeapon.SetSubType(subtype: int) -> null",
		description: "Set the weapon subtype."
	},
	UsesClipsForAmmo1: {
		signature: "CBaseCombatWeapon.UsesClipsForAmmo1() -> bool",
		description: "Do we use clips for ammo 1?"
	},
	UsesClipsForAmmo2: {
		signature: "CBaseCombatWeapon.UsesClipsForAmmo2() -> bool",
		description: "Do we use clips for ammo 2?"
	},
	UsesPrimaryAmmo: {
		signature: "CBaseCombatWeapon.UsesPrimaryAmmo() -> bool",
		description: "Do we use primary ammo?"
	},
	UsesSecondaryAmmo: {
		signature: "CBaseCombatWeapon.UsesSecondaryAmmo() -> bool",
		description: "Do we use secondary ammo?"
	},
	VisibleInWeaponSelection: {
		signature: "CBaseCombatWeapon.VisibleInWeaponSelection() -> bool",
		description: "Is this weapon visible in weapon selection?"
	},
	/* --------------------------- *
	 * CBaseFlex                   *
	 * --------------------------- */
	PlayScene: {
		signature: "CBaseFlex.PlayScene(scene_file: string, delay: float) -> float",
		description: "Play the specified .vcd file, causing the related characters to speak and subtitles to play."
	},
	/* --------------------------- *
	 * CBaseCombatCharacter        *
	 * --------------------------- */
	GetLastKnownArea: {
		signature: "CBaseCombatCharacter.GetLastKnownArea() -> handle",
		description: "Return the last nav area occupied, NULL if unknown."
	},
	/* --------------------------- *
	 * CBasePlayer                 *
	 * --------------------------- */
	GetForceLocalDraw: {
		signature: "CBasePlayer.GetForceLocalDraw() -> bool",
		description: "Whether the player is being forced by SetForceLocalDraw to be drawn."
	},
	GetPlayerMaxs: {
		signature: "CBasePlayer.GetPlayerMaxs() -> Vector",
		description: "Get a vector containing max bounds of the player in local space. The player's model scale will affect the result."
	},
	GetPlayerMins: {
		signature: "CBasePlayer.GetPlayerMins() -> Vector",
		description: "Get a vector containing min bounds of the player in local space. The player's model scale will affect the result."
	},
	GetScriptOverlayMaterial: {
		signature: "CBasePlayer.GetScriptOverlayMaterial() -> string",
		description: "Gets the current overlay material set by SetScriptOverlayMaterial."
	},
	IsNoclipping: {
		signature: "CBasePlayer.IsNoclipping() -> bool",
		description: "Returns true if the player is in noclip mode."
	},
	SetForceLocalDraw: {
		signature: "CBasePlayer.SetForceLocalDraw(toggle: bool) -> null",
		description: "Forces the player to be drawn as if they were in thirdperson."
	},
	SetScriptOverlayMaterial: {
		signature: "CBasePlayer.SetScriptOverlayMaterial(material: string) -> null",
		description: "Sets the overlay material that can't be overriden by other overlays. E.g. Jarate."
	},
	SnapEyeAngles: {
		signature: "CBasePlayer.SnapEyeAngles(angles: QAngle) -> null",
		description: "Snap the player's eye angles to this."
	},
	ViewPunch: {
		signature: "CBasePlayer.ViewPunch(angle_offset: QAngle) -> null",
		description: "Ow! Punches the player's view."
	},
	ViewPunchReset: {
		signature: "CBasePlayer.ViewPunchReset(tolerance: float) -> null",
		description: "Reset's the player's view punch if the offset stays below the given tolerance."
	},
	/* --------------------------- *
	 * CEconEntity                 *
	 * --------------------------- */
	AddAttribute: {
		signature: "CEconEntity.AddAttribute(name: string, value: float, duration: float) -> null",
		description: "Add an attribute to the entity. <s>Set duration to 0 or lower for the attribute to be applied forever</s> See the bug below. The attribute must be one that exists in the game, invalid ones will not be added."
	},
	GetAttribute: {
		signature: "CEconEntity.GetAttribute(name: string, default_value: float) -> float",
		description: "Get an attribute float from the entity. If the attribute does not exist, returns `default_value`."
	},
	RemoveAttribute: {
		signature: "CEconEntity.RemoveAttribute(name: string) -> null",
		description: "Remove an attribute from the entity."
	},
	ReapplyProvision: {
		signature: "CEconEntity.ReapplyProvision() -> null",
		description: "Relinks attributes to provisioners, e.g. calling this on a weapon will add it's attributes to the player."
	},
	/* --------------------------- *
	 * CTFPlayer                   *
	 * --------------------------- */
	AddCond: {
		signature: "CTFPlayer.AddCond(cond: ETFCond) -> null",
		description: "See [ETFCond](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFCond)."
	},
	AddCondEx: {
		signature: "CTFPlayer.AddCondEx(cond: ETFCond, duration: float, provider: handle) -> null",
		description: "See [ETFCond](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFCond)."
	},
	AddCurrency: {
		signature: "CTFPlayer.AddCurrency(amount: int) -> null",
		description: "Kaching! Give the player some cash for game modes with upgrades, ie. MvM. The new value is bounded between 0-30000."
	},
	AddCustomAttribute: {
		signature: "CTFPlayer.AddCustomAttribute(name: string, value: float, duration: float) -> null",
		description: "Add a custom attribute to the player. Set duration to 0 or lower for the attribute to be applied forever. The attribute must be one that exists in the game, invalid ones will not be added."
	},
	AddHudHideFlags: {
		signature: "CTFPlayer.AddHudHideFlags(flags: FHideHUD) -> null",
		description: "Hides a hud element(-s).\n\nSee [FHideHUD](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FHideHUD)."
	},
	ApplyPunchImpulseX: {
		signature: "CTFPlayer.ApplyPunchImpulseX(impulse: float) -> bool",
		description: "Apply a view punch along the pitch angle. Used to flinch players when hit. If the player is a fully charged scoped-in sniper and the weapon has the `aiming_no_flinch` attribute, the punch will not apply. Returns true if the punch was applied."
	},
	BleedPlayer: {
		signature: "CTFPlayer.BleedPlayer(duration: float) -> null",
		description: "Make a player bleed for a set duration of time."
	},
	BleedPlayerEx: {
		signature: "CTFPlayer.BleedPlayerEx(duration: float, damage: int, endless: bool, custom_damage_type: ETFDmgCustom) -> null",
		description: "Make a player bleed for a set duration of time, or forever, with specific damage per tick and damage_custom index.\n\nSee [ETFDmgCustom](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFDmgCustom)."
	},
	CancelTaunt: {
		signature: "CTFPlayer.CancelTaunt() -> null",
		description: "Cancels any taunt in progress."
	},
	CanAirDash: {
		signature: "CTFPlayer.CanAirDash() -> bool",
		description: "Can the player air dash/double jump?"
	},
	CanBeDebuffed: {
		signature: "CTFPlayer.CanBeDebuffed() -> bool"
	},
	CanBreatheUnderwater: {
		signature: "CTFPlayer.CanBreatheUnderwater() -> bool"
	},
	CanDuck: {
		signature: "CTFPlayer.CanDuck() -> bool",
		description: "Can the player duck?"
	},
	CanGetWet: {
		signature: "CTFPlayer.CanGetWet() -> bool",
		description: "Can the player get wet by jarate/milk?"
	},
	CanJump: {
		signature: "CTFPlayer.CanJump() -> bool",
		description: "Can the player jump? Returns false if the player is taunting or if the `no_jump` attribute is present and non-zero. There is other conditions that prevent jumping but this function by itself doesn't check those."
	},
	ClearCustomModelRotation: {
		signature: "CTFPlayer.ClearCustomModelRotation() -> null"
	},
	ClearSpells: {
		signature: "CTFPlayer.ClearSpells() -> null"
	},
	ClearTauntAttack: {
		signature: "CTFPlayer.ClearTauntAttack() -> null",
		description: "Stops active taunt from damaging or cancels Rock-Paper-Scissors result."
	},
	CanPlayerMove: {
		signature: "CTFPlayer.CanPlayerMove() -> bool",
		description: "Can the player move?"
	},
	DoTauntAttack: {
		signature: "CTFPlayer.DoTauntAttack() -> null",
		description: "Performs taunts attacks if available. Player must be already taunting and taunt must have a valid attack assigned (`taunt attack name` attribute)."
	},
	DropFlag: {
		signature: "CTFPlayer.DropFlag(silent: bool) -> null",
		description: "Force player to drop the flag (intelligence)."
	},
	DropRune: {
		signature: "CTFPlayer.DropRune(apply_force: bool, team: ETFTeam) -> null",
		description: "Force player to drop the rune.\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
	},
	EndLongTaunt: {
		signature: "CTFPlayer.EndLongTaunt() -> null",
		description: "Stops a looping taunt (obeys minimum time rules and plays outro animation if available)."
	},
	EquipWearableViewModel: {
		signature: "CTFPlayer.EquipWearableViewModel(entity: handle) -> null",
		description: "Equips a wearable on the viewmodel. Intended to be used with [tf_wearable_vm](https://developer.valvesoftware.com/wiki/tf_wearable_vm) entities."
	},
	ExtinguishPlayerBurning: {
		signature: "CTFPlayer.ExtinguishPlayerBurning() -> null"
	},
	FiringTalk: {
		signature: "CTFPlayer.FiringTalk() -> null",
		description: "Makes eg. a heavy go AAAAAAAAAAaAaa like they are firing their minigun."
	},
	ForceChangeTeam: {
		signature: "CTFPlayer.ForceChangeTeam(team: ETFTeam, full_team_switch: bool) -> null",
		description: "Force player to change their team. Setting the bool to true will not remove nemesis relationships or reset the player's class, as well as not slaying the player.\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
	},
	ForceRegenerateAndRespawn: {
		signature: "CTFPlayer.ForceRegenerateAndRespawn() -> null",
		description: "Force regenerates and respawns the player."
	},
	ForceRespawn: {
		signature: "CTFPlayer.ForceRespawn() -> null",
		description: "Force respawns the player."
	},
	GetActiveWeapon: {
		signature: "CTFPlayer.GetActiveWeapon() -> handle",
		description: "Get the player's current weapon."
	},
	GetBackstabs: {
		signature: "CTFPlayer.GetBackstabs() -> int"
	},
	GetBonusPoints: {
		signature: "CTFPlayer.GetBonusPoints() -> int"
	},
	GetBotType: {
		signature: "CTFPlayer.GetBotType() -> int"
	},
	GetBuildingsDestroyed: {
		signature: "CTFPlayer.GetBuildingsDestroyed() -> int"
	},
	GetCaptures: {
		signature: "CTFPlayer.GetCaptures() -> int"
	},
	GetClassEyeHeight: {
		signature: "CTFPlayer.GetClassEyeHeight() -> Vector",
		description: "Gets the eye height of the player."
	},
	GetCondDuration: {
		signature: "CTFPlayer.GetCondDuration(cond: ETFCond) -> float",
		description: "Returns duration of the condition. Returns 0 if the cond is not applied. Returns -1 if the cond is infinite.\n\nSee [ETFCond](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFCond)."
	},
	GetCustomAttribute: {
		signature: "CTFPlayer.GetCustomAttribute(name: string, default_value: float) -> float",
		description: "Get an attribute float from the player. If the attribute does not exist, returns `default_value`."
	},
	GetCurrency: {
		signature: "CTFPlayer.GetCurrency() -> int",
		description: "Get player's cash for game modes with upgrades, ie. MvM."
	},
	GetCurrentTauntMoveSpeed: {
		signature: "CTFPlayer.GetCurrentTauntMoveSpeed() -> float"
	},
	GetDefenses: {
		signature: "CTFPlayer.GetDefenses() -> int"
	},
	GetDisguiseAmmoCount: {
		signature: "CTFPlayer.GetDisguiseAmmoCount() -> int"
	},
	GetDisguiseTarget: {
		signature: "CTFPlayer.GetDisguiseTarget() -> handle"
	},
	GetDisguiseTeam: {
		signature: "CTFPlayer.GetDisguiseTeam() -> int"
	},
	GetDominations: {
		signature: "CTFPlayer.GetDominations() -> int"
	},
	GetGrapplingHookTarget: {
		signature: "CTFPlayer.GetGrapplingHookTarget() -> handle",
		description: "What entity is the player grappling?"
	},
	GetHeadshots: {
		signature: "CTFPlayer.GetHeadshots() -> int"
	},
	GetHealPoints: {
		signature: "CTFPlayer.GetHealPoints() -> int"
	},
	GetHealTarget: {
		signature: "CTFPlayer.GetHealTarget() -> handle",
		description: "Who is the medic healing?"
	},
	GetHudHideFlags: {
		signature: "CTFPlayer.GetHudHideFlags() -> int",
		description: "Gets current hidden hud elements."
	},
	GetInvulns: {
		signature: "CTFPlayer.GetInvulns() -> int"
	},
	GetKillAssists: {
		signature: "CTFPlayer.GetKillAssists() -> int"
	},
	GetLastWeapon: {
		signature: "CTFPlayer.GetLastWeapon() -> handle"
	},
	GetNextChangeClassTime: {
		signature: "CTFPlayer.GetNextChangeClassTime() -> float",
		description: "Get next change class time."
	},
	GetNextChangeTeamTime: {
		signature: "CTFPlayer.GetNextChangeTeamTime() -> float",
		description: "Get next change team time."
	},
	GetNextRegenTime: {
		signature: "CTFPlayer.GetNextRegenTime() -> float",
		description: "Get next health regen time."
	},
	GetPlayerClass: {
		signature: "CTFPlayer.GetPlayerClass() -> int"
	},
	GetRageMeter: {
		signature: "CTFPlayer.GetRageMeter() -> float"
	},
	GetResupplyPoints: {
		signature: "CTFPlayer.GetResupplyPoints() -> int"
	},
	GetRevenge: {
		signature: "CTFPlayer.GetRevenge() -> int"
	},
	GetScoutHypeMeter: {
		signature: "CTFPlayer.GetScoutHypeMeter() -> float"
	},
	GetSpyCloakMeter: {
		signature: "CTFPlayer.GetSpyCloakMeter() -> float"
	},
	GetTeleports: {
		signature: "CTFPlayer.GetTeleports() -> int"
	},
	GetTauntAttackTime: {
		signature: "CTFPlayer.GetTauntAttackTime() -> float",
		description: "Timestamp until a taunt attack \"lasts\". 0 if unavailable."
	},
	GetTauntRemoveTime: {
		signature: "CTFPlayer.GetTauntRemoveTime() -> float",
		description: "Timestamp until taunt is stopped."
	},
	GetVehicleReverseTime: {
		signature: "CTFPlayer.GetVehicleReverseTime() -> float",
		description: "Timestamp when kart was reversed."
	},
	GetTimeSinceCalledForMedic: {
		signature: "CTFPlayer.GetTimeSinceCalledForMedic() -> float",
		description: "When did the player last call medic."
	},
	GrantOrRemoveAllUpgrades: {
		signature: "CTFPlayer.GrantOrRemoveAllUpgrades(remove: bool, refund: bool) -> null"
	},
	HasItem: {
		signature: "CTFPlayer.HasItem() -> bool",
		description: "Currently holding an item? Eg. capture flag."
	},
	HandleTauntCommand: {
		signature: "CTFPlayer.HandleTauntCommand(taunt_slot: int) -> null",
		description: "Spoofs a taunt command from the player, as if they selected this taunt. This can be abused to give the player any taunt, see the [examples page](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/VScript_Examples#Giving a taunt)."
	},
	IgnitePlayer: {
		signature: "CTFPlayer.IgnitePlayer() -> null",
		description: "Supposed to set the player on fire, but..."
	},
	InAirDueToExplosion: {
		signature: "CTFPlayer.InAirDueToExplosion() -> bool"
	},
	InAirDueToKnockback: {
		signature: "CTFPlayer.InAirDueToKnockback() -> bool"
	},
	InCond: {
		signature: "CTFPlayer.InCond(cond: ETFCond) -> bool",
		description: "See [ETFCond](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFCond)."
	},
	IsAirDashing: {
		signature: "CTFPlayer.IsAirDashing() -> bool"
	},
	IsAllowedToRemoveTaunt: {
		signature: "CTFPlayer.IsAllowedToRemoveTaunt() -> bool",
		description: "Returns true if the taunt will be stopped."
	},
	IsAllowedToTaunt: {
		signature: "CTFPlayer.IsAllowedToTaunt() -> bool"
	},
	IsBotOfType: {
		signature: "CTFPlayer.IsBotOfType(type: EBotType) -> bool",
		description: "Returns true if the player matches this bot type. Only one type of bot exists which is reserved for AI bots (not [https://wiki.teamfortress.com/wiki/Bots#Puppet_bots puppet bots]). 0 is used for real players or puppet bots. Use `IsFakeClient` to check for a puppet bot instead.\n\nSee [EBotType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#EBotType)."
	},
	IsCallingForMedic: {
		signature: "CTFPlayer.IsCallingForMedic() -> bool",
		description: "Is this player calling for medic?"
	},
	IsCarryingRune: {
		signature: "CTFPlayer.IsCarryingRune() -> bool"
	},
	IsControlStunned: {
		signature: "CTFPlayer.IsControlStunned() -> bool"
	},
	IsCritBoosted: {
		signature: "CTFPlayer.IsCritBoosted() -> bool"
	},
	IsFakeClient: {
		signature: "CTFPlayer.IsFakeClient() -> bool",
		description: "Returns true if the player is a puppet or AI bot. To check if the player is a AI bot (`CTFBot`) specifically, use `IsBotOfType` instead."
	},
	IsFireproof: {
		signature: "CTFPlayer.IsFireproof() -> bool"
	},
	IsFullyInvisible: {
		signature: "CTFPlayer.IsFullyInvisible() -> bool"
	},
	IsHypeBuffed: {
		signature: "CTFPlayer.IsHypeBuffed() -> bool"
	},
	IsImmuneToPushback: {
		signature: "CTFPlayer.IsImmuneToPushback() -> bool"
	},
	IsInspecting: {
		signature: "CTFPlayer.IsInspecting() -> bool"
	},
	IsInvulnerable: {
		signature: "CTFPlayer.IsInvulnerable() -> bool"
	},
	IsJumping: {
		signature: "CTFPlayer.IsJumping() -> bool"
	},
	IsMiniBoss: {
		signature: "CTFPlayer.IsMiniBoss() -> bool",
		description: "Is this player an MvM mini-boss?"
	},
	IsParachuteEquipped: {
		signature: "CTFPlayer.IsParachuteEquipped() -> bool"
	},
	IsPlacingSapper: {
		signature: "CTFPlayer.IsPlacingSapper() -> bool",
		description: "Returns true if we placed a sapper in the last few moments."
	},
	IsRageDraining: {
		signature: "CTFPlayer.IsRageDraining() -> bool"
	},
	IsRegenerating: {
		signature: "CTFPlayer.IsRegenerating() -> bool"
	},
	IsSapping: {
		signature: "CTFPlayer.IsSapping() -> bool",
		description: "Returns true if we are currently sapping."
	},
	IsSnared: {
		signature: "CTFPlayer.IsSnared() -> bool"
	},
	IsStealthed: {
		signature: "CTFPlayer.IsStealthed() -> bool"
	},
	IsTaunting: {
		signature: "CTFPlayer.IsTaunting() -> bool"
	},
	IsUsingActionSlot: {
		signature: "CTFPlayer.IsUsingActionSlot() -> bool"
	},
	IsViewingCYOAPDA: {
		signature: "CTFPlayer.IsViewingCYOAPDA() -> bool"
	},
	Regenerate: {
		signature: "CTFPlayer.Regenerate(refill_health_ammo: bool) -> null",
		description: "Resupplies a player. If refill health/ammo is set, clears negative conds, gives back player health/ammo."
	},
	RemoveAllItems: {
		signature: "CTFPlayer.RemoveAllItems(unused: bool) -> null"
	},
	RemoveAllObjects: {
		signature: "CTFPlayer.RemoveAllObjects(explode: bool) -> null",
		description: "Remove all player objects. Eg. dispensers/sentries."
	},
	RemoveCond: {
		signature: "CTFPlayer.RemoveCond(cond: ETFCond) -> null",
		description: "Removes a condition. Does not remove a condition if the minimum duration has not passed. Does nothing if the condition isn't added (interally does `InCond` check).\n\nSee [ETFCond](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFCond)."
	},
	RemoveCondEx: {
		signature: "CTFPlayer.RemoveCondEx(cond: ETFCond, ignore_duration: bool) -> null",
		description: "Extended version of above function. Allows forcefully removing the condition even if minimum duration is not met.\n\nSee [ETFCond](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFCond)."
	},
	RemoveCurrency: {
		signature: "CTFPlayer.RemoveCurrency(amount: int) -> null",
		description: "Take away money from a player for reasons such as ie. spending. Lower bounded to 0."
	},
	RemoveCustomAttribute: {
		signature: "CTFPlayer.RemoveCustomAttribute(name: string) -> null",
		description: "Remove a custom attribute to the player."
	},
	RemoveDisguise: {
		signature: "CTFPlayer.RemoveDisguise() -> null",
		description: "Undisguise a spy."
	},
	RemoveHudHideFlags: {
		signature: "CTFPlayer.RemoveHudHideFlags(flags: FHideHUD) -> null",
		description: "Unhides a hud element(-s).\n\nSee [FHideHUD](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FHideHUD)."
	},
	RemoveInvisibility: {
		signature: "CTFPlayer.RemoveInvisibility() -> null",
		description: "Un-invisible a spy."
	},
	RemoveTeleportEffect: {
		signature: "CTFPlayer.RemoveTeleportEffect() -> null"
	},
	ResetScores: {
		signature: "CTFPlayer.ResetScores() -> null"
	},
	RollRareSpell: {
		signature: "CTFPlayer.RollRareSpell() -> null"
	},
	SetCondDuration: {
		signature: "CTFPlayer.SetCondDuration(cond: ETFCond, duration: float) -> null",
		description: "See [ETFCond](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFCond)."
	},
	SetCurrency: {
		signature: "CTFPlayer.SetCurrency(amount: int) -> null",
		description: "Set player's cash for game modes with upgrades, ie. MvM. Does not have any bounds checking."
	},
	SetCurrentTauntMoveSpeed: {
		signature: "CTFPlayer.SetCurrentTauntMoveSpeed(speed: float) -> null"
	},
	SetCustomModel: {
		signature: "CTFPlayer.SetCustomModel(model_name: string) -> null",
		description: "Sets a custom player model without animations (model will T-pose). To enable animations, use `SetCustomModelWithClassAnimations` instead."
	},
	SetCustomModelOffset: {
		signature: "CTFPlayer.SetCustomModelOffset(offset: Vector) -> null"
	},
	SetCustomModelRotates: {
		signature: "CTFPlayer.SetCustomModelRotates(toggle: bool) -> null"
	},
	SetCustomModelRotation: {
		signature: "CTFPlayer.SetCustomModelRotation(angles: QAngle) -> null"
	},
	SetCustomModelVisibleToSelf: {
		signature: "CTFPlayer.SetCustomModelVisibleToSelf(toggle: bool) -> null"
	},
	SetCustomModelWithClassAnimations: {
		signature: "CTFPlayer.SetCustomModelWithClassAnimations(model_name: string) -> null",
		description: "Sets a custom player model with full animations."
	},
	SetDisguiseAmmoCount: {
		signature: "CTFPlayer.SetDisguiseAmmoCount(count: int) -> null"
	},
	SetForcedTauntCam: {
		signature: "CTFPlayer.SetForcedTauntCam(toggle: int) -> null"
	},
	SetGrapplingHookTarget: {
		signature: "CTFPlayer.SetGrapplingHookTarget(entity: handle, bleed: bool) -> null",
		description: "Set the player's target grapple entity."
	},
	SetHudHideFlags: {
		signature: "CTFPlayer.SetHudHideFlags(flags: FHideHUD) -> null",
		description: "Force hud hide flags to a value.\n\nSee [FHideHUD](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FHideHUD)."
	},
	SetIsMiniBoss: {
		signature: "CTFPlayer.SetIsMiniBoss(toggle: bool) -> null",
		description: "Make this player an MvM mini-boss."
	},
	SetNextChangeClassTime: {
		signature: "CTFPlayer.SetNextChangeClassTime(time: float) -> null",
		description: "Set next change class time."
	},
	SetNextChangeTeamTime: {
		signature: "CTFPlayer.SetNextChangeTeamTime(time: float) -> null",
		description: "Set next change team time."
	},
	SetNextRegenTime: {
		signature: "CTFPlayer.SetNextRegenTime(time: float) -> null",
		description: "Set next available resupply time."
	},
	SetPlayerClass: {
		signature: "CTFPlayer.SetPlayerClass(class_index: ETFClass) -> null",
		description: "Sets the player class. Updates the player's visuals and model.\n\nSee [ETFClass](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFClass)."
	},
	SetRageMeter: {
		signature: "CTFPlayer.SetRageMeter(percent: float) -> null",
		description: "Sets rage meter from 0 - 100."
	},
	SetRPSResult: {
		signature: "CTFPlayer.SetRPSResult(result: int) -> null",
		description: "Rig the result of Rock-Paper-Scissors (0 - rock, 1 - paper, 2 - scissors)."
	},
	SetScoutHypeMeter: {
		signature: "CTFPlayer.SetScoutHypeMeter(percent: float) -> null",
		description: "Sets hype meter from 0 - 100."
	},
	SetSpyCloakMeter: {
		signature: "CTFPlayer.SetSpyCloakMeter(float) -> null",
		description: "Sets cloakmeter from 0 - 100."
	},
	SetVehicleReverseTime: {
		signature: "CTFPlayer.SetVehicleReverseTime(time: float) -> null",
		description: "Set the timestamp when kart was reversed."
	},
	SetUseBossHealthBar: {
		signature: "CTFPlayer.SetUseBossHealthBar(toggle: bool) -> null"
	},
	StopTaunt: {
		signature: "CTFPlayer.StopTaunt(remove_prop: bool) -> null",
		description: "Stops current taunt. If `remove_prop` is true, the taunt prop will be immediately deleted instead of potentially delaying."
	},
	StunPlayer: {
		signature: "CTFPlayer.StunPlayer(duration: float, move_speed_reduction: float, flags: TF_STUN, attacker: handle) -> null",
		description: "Stuns the player for a specified duration. Move speed reduction is a fraction (0 = no reduction. 1 = total reduction, no movement). Flag combinations control the stun type and behavior.\n\nSee [TF_STUN](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TF_STUN)."
	},
	Taunt: {
		signature: "CTFPlayer.Taunt(taunt_index: FTaunts, taunt_concept: MP_CONCEPT) -> null",
		description: "Performs a taunt if allowed. Concept is the \"voiceline\" index to use with the taunt. For `TAUNT_SHOW_ITEM` and `TAUNT_BASE_WEAPON` this is set automatically. `TAUNT_LONG` is not supported.\n\nSee [FTaunts](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FTaunts) ,[MP_CONCEPT](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#MP_CONCEPT)."
	},
	TryToPickupBuilding: {
		signature: "CTFPlayer.TryToPickupBuilding() -> bool",
		description: "Make the player attempt to pick up a building in front of them."
	},
	UpdateSkin: {
		signature: "CTFPlayer.UpdateSkin(skin: int) -> null"
	},
	WasInCond: {
		signature: "CTFPlayer.WasInCond(cond: ETFCond) -> bool",
		description: "See [ETFCond](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFCond)."
	},
	Weapon_CanUse: {
		signature: "CTFPlayer.Weapon_CanUse(weapon: handle) -> bool"
	},
	Weapon_Drop: {
		signature: "CTFPlayer.Weapon_Drop(weapon: handle) -> null",
		description: "Does nothing!"
	},
	Weapon_DropEx: {
		signature: "CTFPlayer.Weapon_DropEx(weapon: handle, target: Vector, velocity: Vector) -> null",
		description: "Does nothing!"
	},
	Weapon_Equip: {
		signature: "CTFPlayer.Weapon_Equip(weapon: handle) -> null",
		description: "Equips a weapon in the player. This places it inside the `m_hMyWeapons` array."
	},
	Weapon_SetLast: {
		signature: "CTFPlayer.Weapon_SetLast(weapon: handle) -> null"
	},
	Weapon_ShootPosition: {
		signature: "CTFPlayer.Weapon_ShootPosition() -> Vector",
		description: "The same as calling `EyePosition`."
	},
	Weapon_Switch: {
		signature: "CTFPlayer.Weapon_Switch(weapon: handle) -> null",
		description: "Attempts a switch to the given weapon, if present in the player's inventory (`m_hMyWeapons` array)."
	},
	/* --------------------------- *
	 * CTFBot                      *
	 * --------------------------- */
	AddBotAttribute: {
		signature: "CTFBot.AddBotAttribute(attribute: FTFBotAttributeType) -> null",
		description: "Sets attribute flags on this TFBot.\n\nSee [FTFBotAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FTFBotAttributeType)."
	},
	AddBotTag: {
		signature: "CTFBot.AddBotTag(tag: string) -> null",
		description: "Adds a bot tag."
	},
	AddWeaponRestriction: {
		signature: "CTFBot.AddWeaponRestriction(flags: TFBotWeaponRestrictionType) -> null",
		description: "Adds weapon restriction flags.\n\nSee [TFBotWeaponRestrictionType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TFBotWeaponRestrictionType)."
	},
	ClearAllBotAttributes: {
		signature: "CTFBot.ClearAllBotAttributes() -> null",
		description: "Clears all attribute flags on this TFBot."
	},
	ClearAllBotTags: {
		signature: "CTFBot.ClearAllBotTags() -> null",
		description: "Clears bot tags."
	},
	ClearAllWeaponRestrictions: {
		signature: "CTFBot.ClearAllWeaponRestrictions() -> null",
		description: "Removes all weapon restriction flags."
	},
	ClearAttentionFocus: {
		signature: "CTFBot.ClearAttentionFocus() -> null",
		description: "Clear current focus."
	},
	ClearBehaviorFlag: {
		signature: "CTFBot.ClearBehaviorFlag(flags: TFBOT_BEHAVIOR) -> null",
		description: "Clear the given behavior flag(s) for this bot.\n\nSee [TFBOT_BEHAVIOR](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TFBOT_BEHAVIOR)."
	},
	DelayedThreatNotice: {
		signature: "CTFBot.DelayedThreatNotice(threat: handle, delay: float) -> null",
		description: "Notice the threat after a delay in seconds."
	},
	DisbandCurrentSquad: {
		signature: "CTFBot.DisbandCurrentSquad() -> null",
		description: "Forces the current squad to be entirely disbanded by everyone."
	},
	FindVantagePoint: {
		signature: "CTFBot.FindVantagePoint(max_distance: float) -> handle",
		description: "Get the nav area of the closest vantage point (within distance)."
	},
	GenerateAndWearItem: {
		signature: "CTFBot.GenerateAndWearItem(item_name: string) -> null",
		description: "Give me an item!"
	},
	GetActionPoint: {
		signature: "CTFBot.GetActionPoint() -> handle",
		description: "Get the given action point for this bot."
	},
	GetAllBotTags: {
		signature: "CTFBot.GetAllBotTags(result: table) -> null",
		description: "Get all bot tags. The key is the index, and the value is the tag."
	},
	GetHomeArea: {
		signature: "CTFBot.GetHomeArea() -> handle",
		description: "Sets the home nav area of the bot."
	},
	GetDifficulty: {
		signature: "CTFBot.GetDifficulty() -> int",
		description: "Returns the bot's difficulty level. See [Constants.ETFBotDifficultyType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFBotDifficultyType)."
	},
	GetMaxVisionRangeOverride: {
		signature: "CTFBot.GetMaxVisionRangeOverride() -> float",
		description: "Gets the max vision range override for the bot"
	},
	GetMission: {
		signature: "CTFBot.GetMission() -> int",
		description: "Get this bot's current mission. See [ETFBotMissionType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFBotMissionType)."
	},
	GetMissionTarget: {
		signature: "CTFBot.GetMissionTarget() -> handle",
		description: "Get this bot's current mission target."
	},
	GetNearestKnownSappableTarget: {
		signature: "CTFBot.GetNearestKnownSappableTarget() -> handle",
		description: "Gets the nearest known sappable target."
	},
	GetPrevMission: {
		signature: "CTFBot.GetPrevMission() -> int",
		description: "Get this bot's previous mission. See [ETFBotMissionType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFBotMissionType)."
	},
	GetSpawnArea: {
		signature: "CTFBot.GetSpawnArea() -> handle",
		description: "Return the nav area of where we spawned."
	},
	GetSquadFormationError: {
		signature: "CTFBot.GetSquadFormationError() -> float",
		description: "Gets our formation error coefficient."
	},
	HasBotAttribute: {
		signature: "CTFBot.HasBotAttribute(attribute: FTFBotAttributeType) -> bool",
		description: "Checks if this TFBot has the given attributes.\n\nSee [FTFBotAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FTFBotAttributeType)."
	},
	HasBotTag: {
		signature: "CTFBot.HasBotTag(tag: string) -> bool",
		description: "Checks if this TFBot has the given bot tag."
	},
	HasMission: {
		signature: "CTFBot.HasMission(mission: ETFBotMissionType) -> bool",
		description: "Return true if the given mission is this bot's current mission.\n\nSee [ETFBotMissionType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFBotMissionType)."
	},
	HasWeaponRestriction: {
		signature: "CTFBot.HasWeaponRestriction(flags: TFBotWeaponRestrictionType) -> bool",
		description: "Checks if this TFBot has the given weapon restriction flags.\n\nSee [TFBotWeaponRestrictionType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TFBotWeaponRestrictionType)."
	},
	IsAmmoFull: {
		signature: "CTFBot.IsAmmoFull() -> bool"
	},
	IsAmmoLow: {
		signature: "CTFBot.IsAmmoLow() -> bool"
	},
	IsAttentionFocused: {
		signature: "CTFBot.IsAttentionFocused() -> bool",
		description: "Is our attention focused right now?"
	},
	IsAttentionFocusedOn: {
		signature: "CTFBot.IsAttentionFocusedOn(entity: handle) -> bool",
		description: "Is our attention focused on this entity."
	},
	IsBehaviorFlagSet: {
		signature: "CTFBot.IsBehaviorFlagSet(flags: TFBOT_BEHAVIOR) -> bool",
		description: "Return true if the given behavior flag(s) are set for this bot.\n\nSee [TFBOT_BEHAVIOR](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TFBOT_BEHAVIOR)."
	},
	IsDifficulty: {
		signature: "CTFBot.IsDifficulty(difficulty: ETFBotDifficultyType) -> bool",
		description: "Returns true/false if the bot's difficulty level matches.\n\nSee [ETFBotDifficultyType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFBotDifficultyType)."
	},
	IsInASquad: {
		signature: "CTFBot.IsInASquad() -> bool",
		description: "Checks if we are in a squad."
	},
	IsOnAnyMission: {
		signature: "CTFBot.IsOnAnyMission() -> bool",
		description: "Return true if this bot has a current mission."
	},
	IsWeaponRestricted: {
		signature: "CTFBot.IsWeaponRestricted(weapon: handle) -> bool",
		description: "Checks if the given weapon is restricted for use on the bot."
	},
	LeaveSquad: {
		signature: "CTFBot.LeaveSquad() -> null",
		description: "Makes us leave the current squad (if any)."
	},
	PressAltFireButton: {
		signature: "CTFBot.PressAltFireButton(duration: float) -> null"
	},
	PressFireButton: {
		signature: "CTFBot.PressFireButton(duration: float) -> null"
	},
	PressSpecialFireButton: {
		signature: "CTFBot.PressSpecialFireButton(duration: float) -> null"
	},
	RemoveBotAttribute: {
		signature: "CTFBot.RemoveBotAttribute(attribute: FTFBotAttributeType) -> null",
		description: "Removes attribute flags on this TFBot.\n\nSee [FTFBotAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FTFBotAttributeType)."
	},
	RemoveBotTag: {
		signature: "CTFBot.RemoveBotTag(tag: string) -> null",
		description: "Removes a bot tag."
	},
	RemoveWeaponRestriction: {
		signature: "CTFBot.RemoveWeaponRestriction(flags: TFBotWeaponRestrictionType) -> null",
		description: "Removes weapon restriction flags.\n\nSee [TFBotWeaponRestrictionType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TFBotWeaponRestrictionType)."
	},
	SetActionPoint: {
		signature: "CTFBot.SetActionPoint(entity: handle) -> null",
		description: "Set the given action point for this bot."
	},
	SetAttentionFocus: {
		signature: "CTFBot.SetAttentionFocus(entity: handle) -> null",
		description: "Sets our current attention focus to this entity."
	},
	SetAutoJump: {
		signature: "CTFBot.SetAutoJump(min_time: float, max_time: float) -> null",
		description: "Sets if the bot should automatically jump, and how often."
	},
	SetBehaviorFlag: {
		signature: "CTFBot.SetBehaviorFlag(flags: TFBOT_BEHAVIOR) -> null",
		description: "Set the given behavior flag(s) for this bot.\n\nSee [TFBOT_BEHAVIOR](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TFBOT_BEHAVIOR)."
	},
	SetDifficulty: {
		signature: "CTFBot.SetDifficulty(difficulty: ETFBotDifficultyType) -> null",
		description: "Sets the bots difficulty level.\n\nSee [ETFBotDifficultyType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFBotDifficultyType)."
	},
	SetHomeArea: {
		signature: "CTFBot.SetHomeArea(area: handle) -> null",
		description: "Set the home nav area of the bot, may be null."
	},
	SetMaxVisionRangeOverride: {
		signature: "CTFBot.SetMaxVisionRangeOverride(range: float) -> null",
		description: "Sets max vision range override for the bot."
	},
	SetMission: {
		signature: "CTFBot.SetMission(mission: ETFBotMissionType, reset_behavior: bool) -> null",
		description: "Set this bot's current mission to the given mission.\n\nSee [ETFBotMissionType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFBotMissionType)."
	},
	SetMissionTarget: {
		signature: "CTFBot.SetMissionTarget(entity: handle) -> null",
		description: "Set this bot's mission target to the given entity."
	},
	SetPrevMission: {
		signature: "CTFBot.SetPrevMission(mission: ETFBotMissionType) -> null",
		description: "Set this bot's previous mission to the given mission.\n\nSee [ETFBotMissionType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFBotMissionType)."
	},
	SetScaleOverride: {
		signature: "CTFBot.SetScaleOverride(scale: float) -> null",
		description: "Sets the scale override for the bot."
	},
	SetShouldQuickBuild: {
		signature: "CTFBot.SetShouldQuickBuild(toggle: bool) -> null",
		description: "Sets if the bot should build instantly."
	},
	SetSquadFormationError: {
		signature: "CTFBot.SetSquadFormationError(coefficient: float) -> null",
		description: "Sets our formation error coefficient."
	},
	ShouldAutoJump: {
		signature: "CTFBot.ShouldAutoJump() -> bool",
		description: "Returns if the bot should automatically jump."
	},
	ShouldQuickBuild: {
		signature: "CTFBot.ShouldQuickBuild() -> bool",
		description: "Returns if the bot should build instantly."
	},
	UpdateDelayedThreatNotices: {
		signature: "CTFBot.UpdateDelayedThreatNotices() -> null"
	},
	/* --------------------------- *
	 * CTFBaseBoss                 *
	 * --------------------------- */
	SetResolvePlayerCollisions: {
		signature: "CTFBaseBoss.SetResolvePlayerCollisions(toggle: bool) -> null",
		description: "Sets whether the entity should push away players intersecting its bounding box. On by default."
	},
	/* --------------------------- *
	 * CTFNavArea                  *
	 * --------------------------- */
	AddIncomingConnection: {
		signature: "CTFNavArea.AddIncomingConnection(area: handle, dir: ENavDirType) -> null",
		description: "Add areas that connect TO this area by a ONE-WAY link.\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	ClearAttributeTF: {
		signature: "CTFNavArea.ClearAttributeTF(bits: FTFNavAttributeType) -> null",
		description: "Clear TF-specific area attribute bits.\n\nSee [FTFNavAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FTFNavAttributeType)."
	},
	ComputeClosestPointInPortal: {
		signature: "CTFNavArea.ComputeClosestPointInPortal(to: handle, dir: ENavDirType, close_pos: Vector) -> Vector",
		description: "Compute closest point within the \"portal\" between to an area's direction from the given position.\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	ComputeDirection: {
		signature: "CTFNavArea.ComputeDirection(point: Vector) -> int",
		description: "Return direction from this area to the given point."
	},
	ConnectTo: {
		signature: "CTFNavArea.ConnectTo(area: handle, dir: ENavDirType) -> null",
		description: "Connect this area to given area in given direction.\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	Contains: {
		signature: "CTFNavArea.Contains(area: handle) -> bool",
		description: "Return true if other area is on or above this area, but no others."
	},
	ContainsOrigin: {
		signature: "CTFNavArea.ContainsOrigin(point: Vector) -> bool",
		description: "Return true if given point is on or above this area, but no others."
	},
	DebugDrawFilled: {
		signature: "CTFNavArea.DebugDrawFilled(r: int, g: int, b: int, a: int, duration: float, no_depth_test: bool, margin: float) -> null",
		description: "Draw area as a filled rectangle of the given color."
	},
	Disconnect: {
		signature: "CTFNavArea.Disconnect(area: handle) -> null",
		description: "Disconnect this area from given area."
	},
	FindRandomSpot: {
		signature: "CTFNavArea.FindRandomSpot() -> Vector",
		description: "Get random origin within extent of area."
	},
	GetAdjacentArea: {
		signature: "CTFNavArea.GetAdjacentArea(dir: ENavDirType, n: int) -> handle",
		description: "Return the n'th adjacent area in the given direction.\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	GetAdjacentAreas: {
		signature: "CTFNavArea.GetAdjacentAreas(dir: ENavDirType, result: table) -> null",
		description: "Fills a passed in table with all adjacent areas in the given direction.\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	GetAdjacentCount: {
		signature: "CTFNavArea.GetAdjacentCount(dir: ENavDirType) -> int",
		description: "Get the number of adjacent areas in the given direction.\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	GetAttributes: {
		signature: "CTFNavArea.GetAttributes() -> int",
		description: "Get area attribute bits."
	},
	GetAvoidanceObstacleHeight: {
		signature: "CTFNavArea.GetAvoidanceObstacleHeight() -> float",
		description: "Returns the maximum height of the obstruction above the ground."
	}, /*
	GetCenter: {
		signature: "CTFNavArea.GetCenter() -> Vector",
		description: "Get center origin of area."
	}, */
	GetCorner: {
		signature: "CTFNavArea.GetCorner(dir: ENavDirType) -> Vector",
		description: "Get corner origin of area.\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	GetDistanceSquaredToPoint: {
		signature: "CTFNavArea.GetDistanceSquaredToPoint(pos: Vector) -> float",
		description: "Return shortest distance between point and this area."
	},
	GetDoor: {
		signature: "CTFNavArea.GetDoor() -> handle",
		description: "Returns the door entity above the area."
	},
	GetElevator: {
		signature: "CTFNavArea.GetElevator() -> handle",
		description: "Returns the elevator if in an elevator's path."
	},
	GetElevatorAreas: {
		signature: "CTFNavArea.GetElevatorAreas(result: table) -> null",
		description: "Fills table with a collection of areas reachable via elevator from this area."
	},
	GetID: {
		signature: "CTFNavArea.GetID() -> int",
		description: "Get area ID."
	},
	GetIncomingConnections: {
		signature: "CTFNavArea.GetIncomingConnections(dir: ENavDirType, result: table) -> null",
		description: "Fills a passed in table with areas connected TO this area by a ONE-WAY link (ie: we have no connection back to them).\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	GetParent: {
		signature: "CTFNavArea.GetParent() -> handle",
		description: "Returns the area just prior to this one in the search path."
	},
	GetParentHow: {
		signature: "CTFNavArea.GetParentHow() -> int",
		description: "Returns how we get from parent to us."
	},
	GetPlaceName: {
		signature: "CTFNavArea.GetPlaceName() -> string",
		description: "Get place name if it exists, null otherwise."
	},
	GetPlayerCount: {
		signature: "CTFNavArea.GetPlayerCount(team: ETFTeam) -> int",
		description: "Return number of players of given team currently within this area (team of zero means any/all).\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
	},
	GetRandomAdjacentArea: {
		signature: "CTFNavArea.GetRandomAdjacentArea(dir: ENavDirType) -> handle",
		description: "Return a random adjacent area in the given direction.\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	GetSizeX: {
		signature: "CTFNavArea.GetSizeX() -> float",
		description: "Return the area size along the X axis."
	},
	GetSizeY: {
		signature: "CTFNavArea.GetSizeY() -> float",
		description: "Return the area size along the Y axis."
	},
	GetTravelDistanceToBombTarget: {
		signature: "CTFNavArea.GetTravelDistanceToBombTarget() -> float",
		description: "Gets the travel distance to the MvM bomb target."
	},
	GetZ: {
		signature: "CTFNavArea.GetZ(pos: Vector) -> float",
		description: "Return Z of area at (x,y) of `pos`."
	},
	HasAttributeTF: {
		signature: "CTFNavArea.HasAttributeTF(bits: FTFNavAttributeType) -> bool",
		description: "Has TF-specific area attribute bits of the given ones.\n\nSee [FTFNavAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FTFNavAttributeType)."
	},
	HasAttributes: {
		signature: "CTFNavArea.HasAttributes(bits: FNavAttributeType) -> bool",
		description: "Has area attribute bits of the given ones?.\n\nSee [FNavAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FNavAttributeType)."
	},
	HasAvoidanceObstacle: {
		signature: "CTFNavArea.HasAvoidanceObstacle(maxheight: float) -> bool",
		description: "Returns true if there's a large, immobile object obstructing this area."
	},
	IsBlocked: {
		signature: "CTFNavArea.IsBlocked(team: ETFTeam, affects_flow: bool) -> bool",
		description: "Return true if team is blocked in this area.\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
	},
	IsBottleneck: {
		signature: "CTFNavArea.IsBottleneck() -> bool",
		description: "Returns true if area is a bottleneck. (tiny narrow areas with only one path)."
	},
	IsCompletelyVisibleToTeam: {
		signature: "CTFNavArea.IsCompletelyVisibleToTeam(team: ETFTeam) -> bool",
		description: "Return true if given area is completely visible from somewhere in this area by someone on the team.\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
	},
	IsConnected: {
		signature: "CTFNavArea.IsConnected(area: handle, dir: ENavDirType) -> bool",
		description: "Return true if this area is connected to other area in given direction. (If you set direction to -1 or 4, it will automatically check all directions for a connection).\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	IsCoplanar: {
		signature: "CTFNavArea.IsCoplanar(area: handle) -> bool",
		description: "Return true if this area and given. area are approximately co-planar."
	},
	IsDamaging: {
		signature: "CTFNavArea.IsDamaging() -> bool",
		description: "Return true if this area is marked to have continuous damage."
	},
	IsDegenerate: {
		signature: "CTFNavArea.IsDegenerate() -> bool",
		description: "Return true if this area is badly formed."
	},
	IsEdge: {
		signature: "CTFNavArea.IsEdge(dir: ENavDirType) -> bool",
		description: "Return true if there are no bi-directional links on the given side.\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	IsFlat: {
		signature: "CTFNavArea.IsFlat() -> bool",
		description: "Return true if this area is approximately flat."
	},
	IsOverlapping: {
		signature: "CTFNavArea.IsOverlapping(area: handle) -> bool",
		description: "Return true if `area` overlaps our 2D extents."
	},
	IsOverlappingOrigin: {
		signature: "CTFNavArea.IsOverlappingOrigin(pos: Vector, tolerance: float) -> bool",
		description: "Return true if `pos` is within 2D extents of area."
	},
	IsPotentiallyVisibleToTeam: {
		signature: "CTFNavArea.IsPotentiallyVisibleToTeam(team: ETFTeam) -> bool",
		description: "Return true if any portion of this area is visible to anyone on the given team.\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
	},
	IsReachableByTeam: {
		signature: "CTFNavArea.IsReachableByTeam(team: ETFTeam) -> bool",
		description: "Is this area reachable by the given team?\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
	},
	IsRoughlySquare: {
		signature: "CTFNavArea.IsRoughlySquare() -> bool",
		description: "Return true if this area is approximately square."
	},
	IsTFMarked: {
		signature: "CTFNavArea.IsTFMarked() -> bool",
		description: "Is this nav area marked with the current marking scope?"
	},
	IsUnderwater: {
		signature: "CTFNavArea.IsUnderwater() -> bool",
		description: "Return true if area is underwater."
	},
	IsValidForWanderingPopulation: {
		signature: "CTFNavArea.IsValidForWanderingPopulation() -> bool",
		description: "Returns true if area is valid for wandering population."
	},
	IsVisible: {
		signature: "CTFNavArea.IsVisible(point: Vector) -> bool",
		description: "Return true if area is visible from the given eyepoint."
	},
	MarkAsBlocked: {
		signature: "CTFNavArea.MarkAsBlocked(team: ETFTeam) -> null",
		description: "Mark this area as blocked for team.\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
	},
	MarkAsDamaging: {
		signature: "CTFNavArea.MarkAsDamaging(duration: float) -> null",
		description: "Mark this area is damaging for the next `duration` seconds."
	},
	MarkObstacleToAvoid: {
		signature: "CTFNavArea.MarkObstacleToAvoid(height: float) -> null",
		description: "Marks the obstructed status of the nav area."
	},
	RemoveAttributes: {
		signature: "CTFNavArea.RemoveAttributes(bits: FNavAttributeType) -> null",
		description: "Removes area attribute bits.\n\nSee [FNavAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FNavAttributeType)."
	},
	RemoveOrthogonalConnections: {
		signature: "CTFNavArea.RemoveOrthogonalConnections(dir: ENavDirType) -> null",
		description: "Removes all connections in directions to left and right of specified direction.\n\nSee [ENavDirType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ENavDirType)."
	},
	SetAttributeTF: {
		signature: "CTFNavArea.SetAttributeTF(bits: FTFNavAttributeType) -> null",
		description: "Set TF-specific area attributes.\n\nSee [FTFNavAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FTFNavAttributeType)."
	},
	SetAttributes: {
		signature: "CTFNavArea.SetAttributes(bits: FNavAttributeType) -> null",
		description: "Set area attribute bits.\n\nSee [FNavAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FNavAttributeType)."
	},
	SetPlaceName: {
		signature: "CTFNavArea.SetPlaceName(name: string) -> null",
		description: "Set place name. If you pass null, the place name will be set to nothing."
	},
	TFMark: {
		signature: "CTFNavArea.TFMark() -> null",
		description: "Mark this nav area with the current marking scope."
	},
	UnblockArea: {
		signature: "CTFNavArea.UnblockArea() -> null",
		description: "Unblocks this area."
	},
	/* --------------------------- *
	 * CScriptKeyValues            *
	 * --------------------------- */
	FindKey: {
		signature: "CScriptKeyValues.FindKey(key: string) -> CScriptKeyValues",
		description: "Find a sub key by the key name."
	},
	GetFirstSubKey: {
		signature: "CScriptKeyValues.GetFirstSubKey() -> CScriptKeyValues",
		description: "Return the first sub key object."
	},
	GetKeyBool: {
		signature: "CScriptKeyValues.GetKeyBool(key: string) -> bool",
		description: "Return the key value as a bool."
	},
	GetKeyFloat: {
		signature: "CScriptKeyValues.GetKeyFloat(key: string) -> float",
		description: "Return the key value as a float."
	},
	GetKeyInt: {
		signature: "CScriptKeyValues.GetKeyInt(key: string) -> int",
		description: "Return the key value as an integer."
	},
	GetKeyString: {
		signature: "CScriptKeyValues.GetKeyString(key: string) -> string",
		description: "Return the key value as a string."
	},
	GetNextKey: {
		signature: "CScriptKeyValues.GetNextKey() -> CScriptKeyValues",
		description: "Return the next neighbor key object to the one the method is called on."
	},
	IsKeyEmpty: {
		signature: "CScriptKeyValues.IsKeyEmpty(key: string) -> bool",
		description: "Returns true if the named key has no value."
	}, /*
	IsValid: {
		signature: "CScriptKeyValues.IsValid() -> bool",
		description: "Whether the handle belongs to a valid key."
	}, */
	ReleaseKeyValues: {
		signature: "CScriptKeyValues.ReleaseKeyValues() -> null",
		description: "Releases the contents of the instance."
	},
	/* --------------------------- *
	 * CEnvEntityMaker             *
	 * --------------------------- */
	SpawnEntity: {
		signature: "CEnvEntityMaker.SpawnEntity() -> null",
		description: "Create an entity at the location of the maker."
	},
	SpawnEntityAtEntityOrigin: {
		signature: "CEnvEntityMaker.SpawnEntityAtEntityOrigin(entity: handle) -> null",
		description: "Create an entity at the location of a specified entity instance."
	},
	SpawnEntityAtLocation: {
		signature: "CEnvEntityMaker.SpawnEntityAtLocation(origin: Vector, orientation: Vector) -> null",
		description: "Create an entity at a specified location and orientation, orientation is Euler angle in degrees (pitch, yaw, roll)."
	},
	SpawnEntityAtNamedEntityOrigin: {
		signature: "CEnvEntityMaker.SpawnEntityAtNamedEntityOrigin(targetname: string) -> null",
		description: "Create an entity at the location of a named entity. If multiple entities have the same name, only the one with the lowest entity index will be targeted."
	},
	/* --------------------------- *
	 * CFuncTrackTrain             *
	 * --------------------------- */
	GetFuturePosition: {
		signature: "CFuncTrackTrain.GetFuturePosition(x: float, speed: float) -> Vector",
		description: "Get a position on the track X seconds in the future."
	},
	/* --------------------------- *
	 * CPointScriptTemplate        *
	 * --------------------------- */
	AddTemplate: {
		signature: "CPointScriptTemplate.AddTemplate(classname: string, keyvalues: table) -> null",
		description: "Add an entity with the given keyvalues to the template spawner, similar to `SpawnEntityFromTable`. The number of templates allowed is unlimited."
	},
	SetGroupSpawnTables: {
		signature: "CPointScriptTemplate.SetGroupSpawnTables(group: table, spawn: table) -> null",
		description: "Unused. This only stores a reference to the two tables which is removed when the"
	},
	/* --------------------------- *
	 * CSceneEntity                *
	 * --------------------------- */
	AddBroadcastTeamTarget: {
		signature: "CSceneEntity.AddBroadcastTeamTarget(index: int) -> null",
		description: "Adds a team (by index) to the broadcast list."
	},
	EstimateLength: {
		signature: "CSceneEntity.EstimateLength() -> float",
		description: "Returns length of this scene in seconds."
	},
	FindNamedEntity: {
		signature: "CSceneEntity.FindNamedEntity(reference: string) -> handle",
		description: "Given an entity reference, such as !target, get actual entity from scene object."
	},
	IsPaused: {
		signature: "CSceneEntity.IsPaused() -> bool",
		description: "If this scene is currently paused."
	},
	IsPlayingBack: {
		signature: "CSceneEntity.IsPlayingBack() -> bool",
		description: "If this scene is currently playing."
	},
	LoadSceneFromString: {
		signature: "CSceneEntity.LoadSceneFromString(scene_name: string, scene: string) -> bool",
		description: "Given a dummy scene name and a vcd string, load the scene."
	},
	RemoveBroadcastTeamTarget: {
		signature: "CSceneEntity.RemoveBroadcastTeamTarget(index: int) -> null",
		description: "Removes a team (by index) from the broadcast list."
	},
	/* --------------------------- *
	 * CCallChainer                *
	 * --------------------------- */
	CCallChainer: {
		signature: "CCallChainer(function_prefix: string, scope: table = null) -> CCallChainer",
		description: "Creates a CCallChainer object that'll collect functions that have a matching prefix in the given scope."
	},
	PostScriptExecute: {
		signature: "CCallChainer.PostScriptExecute() -> null",
		description: "Search for all non-native functions with matching prefixes, then push them into the `chains` table."
	},
	Call: {
		signature: "CCallChainer.Call(event: string, ...args: any) -> bool",
		description: "Find an unprefixed function name in the `chains` table and call it with the given arguments."
	},
	/* --------------------------- *
	 * CSimpleCallChainer          *
	 * --------------------------- */
	CSimpleCallChainer: {
		signature: "CSimpleCallChainer(prefix: string, scope: table = null, exactMatch: bool = false) -> CSimpleCallChainer",
		description: "Creates a CSimpleCallChainer object that'll collect functions that have a matching prefix in the given scope, unless it seek for an exact name match."
	}, /*
	PostScriptExecute: {
		signature: "CSimpleCallChainer.PostScriptExecute() -> null",
		description: "Begin searching for all non-native functions with matching prefixes, then push them into the `chain` array."
	},
	Call: {
		signature: "CSimpleCallChainer.Call(...args: any) -> bool",
		description: "Call all functions inside the `chain` array with the given arguments."
	}, */
	/* --------------------------- *
	 * NextBotCombatCharacter      *
	 * --------------------------- */
	ClearImmobileStatus: {
		signature: "NextBotCombatCharacter.ClearImmobileStatus() -> null",
		description: "Clear immobile status."
	},
	FlagForUpdate: {
		signature: "NextBotCombatCharacter.FlagForUpdate(toggle: bool) -> null",
		description: "Flag this bot for update (or not to update if `toggle` is false)."
	},
	GetBodyInterface: {
		signature: "NextBotCombatCharacter.GetBodyInterface() -> INextBotComponent",
		description: "Get this bot's body interface."
	},
	GetBotId: {
		signature: "NextBotCombatCharacter.GetBotId() -> int",
		description: "Get this bot's id."
	},
	GetImmobileDuration: {
		signature: "NextBotCombatCharacter.GetImmobileDuration() -> float",
		description: "How long have we been immobile."
	},
	GetImmobileSpeedThreshold: {
		signature: "NextBotCombatCharacter.GetImmobileSpeedThreshold() -> float",
		description: "Return units/second below which this actor is considered immobile."
	},
	GetIntentionInterface: {
		signature: "NextBotCombatCharacter.GetIntentionInterface() -> INextBotComponent",
		description: "Get this bot's intention interface."
	},
	GetLocomotionInterface: {
		signature: "NextBotCombatCharacter.GetLocomotionInterface() -> ILocomotion",
		description: "Get this bot's locomotion interface."
	},
	GetTickLastUpdate: {
		signature: "NextBotCombatCharacter.GetTickLastUpdate() -> int",
		description: "Get last update tick."
	},
	GetVisionInterface: {
		signature: "NextBotCombatCharacter.GetVisionInterface() -> INextBotComponent",
		description: "Get this bot's vision interface."
	},
	IsEnemy: {
		signature: "NextBotCombatCharacter.IsEnemy(entity: handle) -> bool",
		description: "Return true if given entity is our enemy."
	},
	IsFlaggedForUpdate: {
		signature: "NextBotCombatCharacter.IsFlaggedForUpdate() -> bool",
		description: "Is this bot flagged for update."
	},
	IsFriend: {
		signature: "NextBotCombatCharacter.IsFriend(entity: handle) -> bool",
		description: "Return true if given entity is our friend."
	},
	IsImmobile: {
		signature: "NextBotCombatCharacter.IsImmobile() -> bool",
		description: "Return true if we haven't moved in awhile."
	},
	/* --------------------------- *
	 * INextBotComponent           *
	 * --------------------------- */
	ComputeUpdateInterval: {
		signature: "INextBotComponent/ILocomotion.ComputeUpdateInterval() -> bool",
		description: "Recomputes the component update interval."
	},
	GetUpdateInterval: {
		signature: "INextBotComponent/ILocomotion.GetUpdateInterval() -> float",
		description: "Returns the component update interval."
	},
	Reset: {
		signature: "INextBotComponent/ILocomotion.Reset() -> null",
		description: "Resets the internal update state"
	},
	/* --------------------------- *
	 * ILocomotion                 *
	 * --------------------------- */
	Approach: {
		signature: "ILocomotion.Approach(goal: Vector, goal_weight: float) -> null",
		description: "The primary locomotive method. Goal determines the destination position to move towards. goal_weight determines the priority of this path, you can set this to 1.0 generally speaking."
	},
	ClearStuckStatus: {
		signature: "ILocomotion.ClearStuckStatus(reason: string) -> null",
		description: "Reset stuck status to un-stuck. Reason message is shown when debugging nextbots."
	},
	ClimbUpToLedge: {
		signature: "ILocomotion.ClimbUpToLedge(goal_pos: Vector, goal_forward: Vector, obstacle: handle) -> bool",
		description: "Initiate a jump to an adjacent high ledge, return false if climb can't start."
	}, /*
	ComputeUpdateInterval: {
		signature: "ILocomotion.ComputeUpdateInterval() -> bool",
		description: "Returns false if no time has elapsed."
	}, */
	DriveTo: {
		signature: "ILocomotion.DriveTo(pos: Vector) -> null",
		description: "Move the bot to the precise given position immediately, updating internal state."
	},
	FaceTowards: {
		signature: "ILocomotion.FaceTowards(target: Vector) -> null",
		description: "Rotate body to face towards target."
	},
	FractionPotentialGap: {
		signature: "ILocomotion.FractionPotentialGap(from: Vector, to: Vector) -> float",
		description: "If the locomotor cannot jump over the gap, returns the fraction of the jumpable ray."
	},
	FractionPotentiallyTraversable: {
		signature: "ILocomotion.FractionPotentiallyTraversable(from: Vector, to: Vector, immediately: bool) -> float",
		description: "If the locomotor could not move along the line given, returns the fraction of the walkable ray. If `immediately` is true, breakables are considered non-traverseable."
	},
	GetDeathDropHeight: {
		signature: "ILocomotion.GetDeathDropHeight() -> float",
		description: "Distance at which we will die if we fall."
	},
	GetDesiredSpeed: {
		signature: "ILocomotion.GetDesiredSpeed() -> float",
		description: "Get desired speed for locomotor movement."
	},
	GetFeet: {
		signature: "ILocomotion.GetFeet() -> Vector",
		description: "Return position of feet - the driving point where the bot contacts the ground."
	},
	GetGround: {
		signature: "ILocomotion.GetGround() -> handle",
		description: "Return the current ground entity or NULL if not on the ground."
	},
	GetGroundMotionVector: {
		signature: "ILocomotion.GetGroundMotionVector() -> Vector",
		description: "Return unit vector in XY plane describing our direction of motion - even if we are currently not moving."
	},
	GetGroundNormal: {
		signature: "ILocomotion.GetGroundNormal() -> Vector",
		description: "Surface normal of the ground we are in contact with."
	},
	GetGroundSpeed: {
		signature: "ILocomotion.GetGroundSpeed() -> float",
		description: "Return current world space speed in XY plane."
	},
	GetMaxAcceleration: {
		signature: "ILocomotion.GetMaxAcceleration() -> float",
		description: "Return maximum acceleration of locomotor."
	},
	GetMaxDeceleration: {
		signature: "ILocomotion.GetMaxDeceleration() -> float",
		description: "Return maximum deceleration of locomotor."
	},
	GetMaxJumpHeight: {
		signature: "ILocomotion.GetMaxJumpHeight() -> float",
		description: "Return maximum height of a jump."
	},
	GetMotionVector: {
		signature: "ILocomotion.GetMotionVector() -> Vector",
		description: "Return unit vector describing our direction of motion - even if we are currently not moving."
	},
	GetRunSpeed: {
		signature: "ILocomotion.GetRunSpeed() -> float",
		description: "Get maximum running speed."
	},
	GetSpeed: {
		signature: "ILocomotion.GetSpeed() -> float",
		description: "Return current world space speed (magnitude of velocity)."
	},
	GetSpeedLimit: {
		signature: "ILocomotion.GetSpeedLimit() -> float",
		description: "Get maximum speed bot can reach, regardless of desired speed."
	},
	GetStepHeight: {
		signature: "ILocomotion.GetStepHeight() -> float",
		description: "If delta Z is lower than this, we can step up the surface (like a stair step), but if delta Z is greater than this, we have to jump to get up."
	},
	GetStuckDuration: {
		signature: "ILocomotion.GetStuckDuration() -> float",
		description: "Return how long we've been stuck."
	},
	GetTraversableSlopeLimit: {
		signature: "ILocomotion.GetTraversableSlopeLimit() -> float",
		description: "Return Z component of unit normal of steepest traversable slope."
	}, /*
	GetUpdateInterval: {
		signature: "ILocomotion.GetUpdateInterval() -> float",
		description: "Returns time between updates."
	}, */
	GetVelocity: {
		signature: "ILocomotion.GetVelocity() -> Vector",
		description: "Return current world space velocity."
	},
	GetWalkSpeed: {
		signature: "ILocomotion.GetWalkSpeed() -> float",
		description: "Get maximum walking speed."
	},
	HasPotentialGap: {
		signature: "ILocomotion.HasPotentialGap(from: Vector, to: Vector) -> float",
		description: "Checks if there is a possible gap that will need to be jumped over. Returns fraction of ray from 0 to 1."
	},
	IsAbleToClimb: {
		signature: "ILocomotion.IsAbleToClimb() -> bool",
		description: "Return true if this bot can climb arbitrary geometry it encounters."
	},
	IsAbleToJumpAcrossGaps: {
		signature: "ILocomotion.IsAbleToJumpAcrossGaps() -> bool",
		description: "Return true if this bot can jump across gaps in its path."
	},
	IsAreaTraversable: {
		signature: "ILocomotion.IsAreaTraversable(area: handle) -> bool",
		description: "Return true if given area can be used for navigation."
	},
	IsAttemptingToMove: {
		signature: "ILocomotion.IsAttemptingToMove() -> bool",
		description: "Return true if we have tried to Approach() or DriveTo() very recently."
	},
	IsClimbingOrJumping: {
		signature: "ILocomotion.IsClimbingOrJumping() -> bool",
		description: "Is jumping in any form."
	},
	IsClimbingUpToLedge: {
		signature: "ILocomotion.IsClimbingUpToLedge() -> bool",
		description: "Is climbing up to a high ledge."
	},
	IsEntityTraversable: {
		signature: "ILocomotion.IsEntityTraversable(entity: handle, immediately: bool) -> bool",
		description: "Return true if the entity handle is traversable. If `immediately` is true, breakables are considered non-traverseable."
	},
	IsGap: {
		signature: "ILocomotion.IsGap(pos: Vector, forward: Vector) -> bool",
		description: "Return true if there is a gap at this position."
	},
	IsJumpingAcrossGap: {
		signature: "ILocomotion.IsJumpingAcrossGap() -> bool",
		description: "Is jumping across a gap to the far side."
	},
	IsOnGround: {
		signature: "ILocomotion.IsOnGround() -> bool",
		description: "Return true if standing on something."
	},
	IsPotentiallyTraversable: {
		signature: "ILocomotion.IsPotentiallyTraversable(from: Vector, to: Vector, immediately: bool) -> float",
		description: "Checks if this locomotor could potentially move along the line given. Returns fraction of trace result (1 = clear). If `immediately` is true, breakables are considered non-traverseable."
	},
	IsRunning: {
		signature: "ILocomotion.IsRunning() -> bool",
		description: "Is running?"
	},
	IsScrambling: {
		signature: "ILocomotion.IsScrambling() -> bool",
		description: "Is in the middle of a complex action (climbing a ladder, climbing a ledge, jumping, etc) that shouldn't be interrupted."
	},
	IsStuck: {
		signature: "ILocomotion.IsStuck() -> bool",
		description: "Return true if bot is stuck. If the locomotor cannot make progress, it becomes stuck and can only leave this stuck state by successfully movingand becoming un-stuck."
	},
	Jump: {
		signature: "ILocomotion.Jump() -> null",
		description: "Initiate a simple undirected jump in the air."
	},
	JumpAcrossGap: {
		signature: "ILocomotion.JumpAcrossGap(goal_pos: Vector, goal_forward: Vector) -> null",
		description: "Initiate a jump across an empty volume of space to far side."
	},
	OnLandOnGround: {
		signature: "ILocomotion.OnLandOnGround(ground: handle) -> null",
		description: "Manually run the OnLandOnGround callback. Typically invoked when bot lands on the ground after being in the air."
	},
	OnLeaveGround: {
		signature: "ILocomotion.OnLeaveGround(ground: handle) -> null",
		description: "Manually run the OnLeaveGround callback. Typically invoked when bot leaves ground for any reason."
	}, /*
	Reset: {
		signature: "ILocomotion.Reset() -> null",
		description: "Resets motion, stuck state etc."
	}, */
	Run: {
		signature: "ILocomotion.Run() -> null",
		description: "Set desired movement speed to running."
	},
	SetDesiredSpeed: {
		signature: "ILocomotion.SetDesiredSpeed(speed: float) -> null",
		description: "Set desired speed for locomotor movement."
	},
	SetSpeedLimit: {
		signature: "ILocomotion.SetSpeedLimit(limit: float) -> null",
		description: "Set maximum speed bot can reach, regardless of desired speed."
	},
	Stop: {
		signature: "ILocomotion.Stop() -> null",
		description: "Set desired movement speed to stopped."
	},
	Walk: {
		signature: "ILocomotion.Walk() -> null",
		description: "Set desired movement speed to walking"
	},
	/* --------------------------- *
	 * regexp                      *
	 * --------------------------- */
	regexp: {
		signature: "regexp(pattern: string) -> regexp"
	},
	capture: {
		signature: "regexp.capture(str: string, start: int = 0) -> table",
		description: "Returns an array of tables containing two indexes (\"begin\" and \"end\") of the first match of the regular expression in the string str. An array entry is created for each captured sub expressions. If no match occurs returns null. The search starts from the index start of the string, if start is omitted the search starts from the beginning of the string."
	},
	match: {
		signature: "regexp.match(str: string) -> bool",
		description: "Returns a true if the regular expression matches the string str, otherwise returns false."
	},
	search: {
		signature: "regexp.search(str: string, start: int = 0) -> table",
		description: "Returns a table containing two indexes (\"begin\" and \"end\") of the first match of the regular expression in the string `str`, otherwise if no match occurs returns null. The search starts from the index start of the string, if start is omitted the search starts from the beginning of the string."
	},
	subexpcount: {
		signature: "regexp.subexpcount()"
	},
	/* --------------------------- *
	 * Vector                      *
	 * --------------------------- */
	Cross: {
		signature: "Vector.Cross(factor: Vector) -> Vector",
		description: "The vector product of two vectors. Returns a vector orthogonal to the input vectors."
	},
	Dot: {
		signature: "Vector.Dot(factor: Vector) -> float",
		description: "The scalar product of two vectors."
	},
	Length: {
		signature: "Vector.Length() -> float",
		description: "Magnitude of the vector."
	},
	LengthSqr: {
		signature: "Vector.LengthSqr() -> float",
		description: "The magnitude of the vector squared."
	},
	Length2D: {
		signature: "Vector.Length2D() -> float",
		description: "Returns the magnitude of the vector on the x-y plane."
	},
	Length2DSqr: {
		signature: "Vector.Length2DSqr() -> float",
		description: "Returns the square of the magnitude of the vector on the x-y plane."
	},
	Norm: {
		signature: "Vector/Quaternion.Norm() -> float",
		description: "Normalizes the vector/quaternion in place and returns it's length."
	},
	Scale: {
		signature: "Vector.Scale(factor: float) -> Vector",
		description: "Scales the vector magnitude."
	},
	ToKVString: {
		signature: "Vector/QAngle/Quaternion.ToKVString() -> string",
		description: "Returns a string without separations commas."
	},
	/* --------------------------- *
	 * QAngle                      *
	 * --------------------------- */
	Forward: {
		signature: "QAngle.Forward() -> Vector",
		description: "Returns the Forward Vector of the angles."
	},
	Left: {
		signature: "QAngle.Left() -> Vector"
	},
	Pitch: {
		signature: "QAngle.Pitch() -> float",
		description: "Returns the pitch angle in degrees."
	},
	Roll: {
		signature: "QAngle.Roll() -> float",
		description: "Returns the roll angle in degrees."
	}, /*
	ToKVString: {
		signature: "QAngle.ToKVString() -> string",
		description: "Returns a string with the values separated by one space."
	},*/
	ToQuat: {
		signature: "QAngle.ToQuat() -> Quaternion",
		description: "Returns a quaternion representaion of the orientation."
	},
	Up: {
		signature: "QAngle.Up() -> Vector",
		description: "Returns the Up Vector of the angles."
	},
	Yaw: {
		signature: "QAngle.Yaw() -> float",
		description: "Returns the yaw angle in degrees."
	},
	/* --------------------------- *
	 * Quaternion                  *
	 * --------------------------- *//*
  Dot: {
	  signature: "Quaternion.Dot(factor: Quaternion) -> float",
	  description: "The 4D scalar product of two quaternions. represents the angle between the quaternions in the range [1, 0]."
  }, */
	Invert: {
		signature: "Quaternion.Invert() -> Quaternion",
		description: "Returns a quaternion with the complimentary rotation."
	},/*
	Norm: {
		signature: "Quaternion.Norm() -> float",
		description: "Normalizes the quaternion."
	},*/
	SetPitchYawRoll: {
		signature: "Quaternion.SetPitchYawRoll(pitch: float, yaw: float, roll: float) -> null",
		description: "Recomputes the quaternion from the supplied Euler angles."
	},/*
	ToKVString: {
		signature: "Quaternion.ToKVString() -> string",
		description: "Returns a string with the values separated by one space."
	},*/
	ToQAngle: {
		signature: "Quaternion.ToQAngle() -> QAngle",
		description: "Returns the angles resulting from the rotation."
	},
	/* --------------------------- *
	 * String                      *
	 * --------------------------- */
	
	find: {
		signature: "string.find(substring: string, start_index: int = null) -> int | null",
		description: "Looks for the sub-string passed as its first parameter, starting at either the beginning of the string or at a specific character index if one is provided as a second parameter. If the sub-string is found, returns the index at which it first occurs, otherwise returns null."
	},
	len: {
		signature: "string/array/table.len() -> int",
		description: "Returns an string's/array's/table's length."
	},
	slice: {
		signature: "string/array.slice(start_index: int, end_index: int = null) -> null",
		description: "Returns a section of the string/array as new string/array. Copies from start to the end (not included). If start is negative the index is calculated as length + start, if end is negative the index is calculated as length + end. If end is omitted end is equal to the string/array length."
	},
	tolower: {
		signature: "string.toupper() -> string",
		description: "Returns a new string with all upper-case characters converted to lower-case."
	},
	toupper: {
		signature: "string.tolower() -> string",
		description: "Returns a new string with all lower-case characters converted to upper-case."
	},
	/* --------------------------- *
	 * Array                       *
	 * --------------------------- */
	append: {
		signature: "array.append(item: any) -> null",
		description: "Adds an item to the end of an array."
	},
	apply: {
		signature: "array.apply(func: function) -> null",
		description: "Applies a function to all of an array's items."
	},
	clear: {
		signature: "table/array.clear() -> null",
		description: "Removes all of the items from an array/table."
	},
	extend: {
		signature: "array.extend(other: array) -> null",
		description: "Combines two arrays into one."
	},
	filter: {
		signature: "array.filter(filter: function) -> null",
		description: "Applies a filter function to an array's items, storing the results in a new array."
	}, /*
	find: {
		signature: "array.find(item: any) -> int | null",
		description: "Finds an index of the value within an array. Returns null if not present."
	}, */
	insert: {
		signature: "array.insert(index: int, item: any) -> null",
		description: "Inserts an item into an array at the specified index."
	}, /*
	len: {
		signature: "array.len() -> int",
		description: "Returns an array's length."
	}, */
	map: {
		signature: "array.map(func: function) -> array",
		description: "Applies a function an array's items, adding the results to a new array."
	},
	pop: {
		signature: "array.pop() -> any",
		description: "Returns and removes the value at the end of the array."
	},
	push: {
		signature: "array.push(item: any) -> null",
		description: "Adds an item to the end of an array."
	},
	reduce: {
		signature: "array.reduce(func: function) -> any",
		description: "This method applies the supplied function to all of the items in the target array, starting with the first two. The function returns a single value which is then combined with the next (third) item in the array — and so on until all of the items have been combined into a single value which the method returns."
	},
	remove: {
		signature: "array.remove(index: int) -> any",
		description: "Returns and removes an array item at a specified index."
	},
	resize: {
		signature: "array.resize(new_size: int, fill: any = null) -> null",
		description: "Increases or decreases the size of an array."
	},
	reverse: {
		signature: "array.reverse() -> null",
		description: "Reverses the order of the elements in an array."
	}, /*
	slice: {
		signature: "array.slice(start_index: int, end_index: int) -> null",
		description: "Creates a new array from an array."
	}, */
	sort: {
		signature: "array.sort(compare: function = null) -> null",
		description: "This method sorts the items within the target array into either a lowest-to-highest order or according to the results of an optional comparison function which may be passed to the method as a parameter. If the items are arrays, blobs, functions, objects and/or tables, they will be sorted by reference not value. The optional comparison function should take two parameters: two values which will be compared in some way. It should return the value -1 if the first value should be placed before the second, or 1 if it should follow the second value. Return 0 if the two values are equivalent."
	},
	top: {
		signature: "array.top() -> any",
		description: "Returns the value at the end of an array."
	},
	/* --------------------------- *
	 * Table                       *
	 * --------------------------- */
	/*
	clear: {
		signature: "table.clear() -> null",
		description: "Removes all of the items from a table."
	}, */
	getdelegate: {
		signature: "table.getdelegate() -> table",
		description: "Returns a table's delegate."
	},
	/*
	len: {
		signature: "table.len() -> int",
		description: "Returns an table's length."
	}, */
	rawdelete: {
		signature: "table.rawdelete(key: any) -> any",
		description: "This method deletes the target slot without employing delegation. If the table lacks the target slot, the methods returns null, otherwise it returns the value associated with that slot."
	},
	rawget: {
		signature: "table/class/handle.rawget(key: any) -> any",
		description: "Retrieves the value of the specified key without employing delegation."
	},
	rawin: {
		signature: "table/class/handle.rawin(key: any) -> bool",
		description: "Checks for the presence of the specified key in the table/class/handle without employing delegation."
	},
	rawset: {
		signature: "table/class/handle.rawset(key: any, value: any) -> any",
		description: "Sets the value of the specified key without employing delegation."
	},
	setdelegate: {
		signature: "table.setdelegate(deletgate: table) -> table",
		description: "This method assigns the passed table as the target’s new custom delegate. The method always returns the target.To remove a delegate, either assign the target with a new delegate, or pass null."
	},
	keys: {
		signature: "table.keys() -> array",
		description: "Returns an array containing all the keys of the table slots."
	},
	values: {
		signature: "table.keys() -> array",
		description: "Returns an array containing all the values of the table slots."
	},
	/* --------------------------- *
	 * Function                    *
	 * --------------------------- */
	acall: {
		signature: "function.acall(args: array) -> any",
		description: "Calls the target function and passes array values into its parameters."
	},
	bindenv: {
		signature: "function.bindenv(scope: table/handle) -> function",
		description: "Clones the target function and binds it to a specified context object."
	},
	call: {
		signature: "function.call(scope: table/handle, ...args: any) -> any",
		description: "Calls the function with a non-default context object."
	},
	pcall: {
		signature: "function.pcall(scope: table/handle, ...args: any) -> any",
		description: "Calls the function with a non-default context object, bypassing Squirrel error callbacks."
	},
	pacall: {
		signature: "function.pacall(args: array) -> any",
		description: "Calls the function with an array of parameters, bypassing Squirrel error callbacks."
	},
	setroot: {
		signature: "function.setroot(root: table) -> null",
		description: "Sets the root table of a closure"
	},
	getroot: {
		signature: "function.getroot() -> table",
		description: "Returns the root table of the closure"
	},
	getinfos: {
		signature: "function.getinfos() -> table",
		description: "Returns a table containing informations about the function, like parameters, name and source name."
	},
	/* --------------------------- *
	 * Class                       *
	 * --------------------------- */
	instance: {
		signature: "class.instance() -> handle",
		description: "Returns a new instance of the class. this function does not invoke the instance constructor. The constructor must be explicitly called (eg. class_inst.constructor(class_inst) )."
	},
	getattributes: {
		signature: "class.getattributes(member_name: string) -> any",
		description: "Returns the attributes of the specified member. if the parameter member is null the function returns the class level attributes."
	},
	setattributes: {
		signature: "class.getattributes(member_name: string, value: any) -> any",
		description: "Sets the attribute of the specified member and returns the previous attribute value. if the parameter member is null the function sets the class level attributes."
	},
	newmember: {
		signature: "class.newmember(key: any, value: any, attrs: table, static: bool",
		description: "Sets/adds the slot `key` with the value `val` and attributes `attrs` and if present invokes the _newmember metamethod. If `static` is true the slot will be added as static. If the slot does not exists - it will be created."
	},
	rawnewmember: {
		signature: "class.rawnewmember(key: any, value: any, attrs: table, static: bool",
		description: "Sets/adds the slot `key` with the value `val` and attributes `attrs`. If `static` is true the slot will be added as static. If the slot does not exists - it will be created."
	},
	
	/* --------------------------- *
	 * Handle                      *
	 * --------------------------- */
	getclass: {
		signature: "handle.getclass() -> class",
		description: "Returns the class that created the instance."
	},
	/* --------------------------- *
	 * Generic                     *
	 * --------------------------- */
	weakref: {
		signature: "object.weakref() -> weakreference",
		description: "Returns a weak reference to the object."
	},
	tofloat: {
		signature: "integer/bool/float/string.tofloat() -> float",
		description: "Returns float value represented by the integer/bool/float/string. For string it must only contain numeric characters and/or plus and minus symbols. An exception is thrown otherwise."
	},
	tointeger: {
		signature: "integer/bool/float/string.tointeger(base: int = 10) -> int",
		description: "Returns integer value represented by the integer/bool/float/string. For string it must only contain numeric characters. An exception is thrown otherwise. Hexadecimal notation is supported (i.e. 0xFF). If a hexadecimal string contains more than 10 characters, including the 0x, returns -1."
	},
	tochar: {
		signature: "integer/float.tochar() -> int",
		description: "Returns a string containing a single character represented by the integer/integer part of the float."
	},
	tostring: {
		signature: "integer/bool/float/string/handle.tostring() -> string",
		description: "Returns a string representation of the corresponding data type. For handles/tables the default return behaviour can be redefined by using _tostring metamethod in the handle's class / table's delegate."
	},
	/* --------------------------- *
	 * Weak Reference              *
	 * --------------------------- */
	ref: {
		signature: "weakreference.ref() -> object",
		description: "Returns the object that the weak reference is pointing at; null if the object that was point at was destroyed."
	}
}

export const allDeprecatedMethods: Docs = {
	/* --------------------------- *
	 * CBaseEntity                 *
	 * --------------------------- */
	__KeyValueFromFloat: {
		signature: "CBaseEntity.__KeyValueFromFloat(key: string, value: float) -> bool",
		description: "`(→ KeyValueFromFloat)`.\n\nBehaves the same as `KeyValueFromFloat`, use that instead."
	},
	__KeyValueFromInt: {
		signature: "CBaseEntity.__KeyValueFromInt(key: string, value: int) -> bool",
		description: "`(→ KeyValueFromInt)`.\n\nBehaves the same as `KeyValueFromInt`, use that instead."
	},
	__KeyValueFromString: {
		signature: "CBaseEntity.__KeyValueFromString(key: string, value: string) -> bool",
		description: "`(→ KeyValueFromString)`.\n\nBehaves the same as `KeyValueFromString`, use that instead."
	},
	__KeyValueFromVector: {
		signature: "CBaseEntity.__KeyValueFromVector(key: string, value: Vector) -> bool",
		description: "`(→ KeyValueFromVector)`.\n\nBehaves the same as `KeyValueFromVector`, use that instead."
	},
	GetAngles: {
		signature: "CBaseEntity.GetAngles() -> Vector",
		description: "`(→ GetAbsAngles)`.\n\nGet the entity's pitch, yaw, and roll as a **Vector**."
	},
	GetLeftVector: {
		signature: "CBaseEntity.GetLeftVector() -> Vector",
		description: "`(→ GetRightVector)`.\n\nGet the *right* vector of the entity. This is purely for compatibility."
	},
	GetVelocity: {
		signature: "CBaseEntity.GetVelocity() -> Vector",
		description: "`(→ GetAbsVelocity)`."
	},
	SetAngles: {
		signature: "CBaseEntity.SetAngles(pitch: float, yaw: float, roll: float) -> null",
		description: "`(→ SetAbsAngles)`.\n\nSet entity angles."
	},
	SetOrigin: {
		signature: "CBaseEntity.SetOrigin(origin: Vector) -> null",
		description: "`(→ SetAbsOrigin)`."
	},
	SetVelocity: {
		signature: "CBaseEntity.SetVelocity(velocity: Vector) -> null",
		description: "`(→ SetAbsVelocity)`."
	}
}

export const allFunctions: Docs = {
	AddThinkToEnt: {
		signature: "AddThinkToEnt(entity: handle, function_name: string) -> null",
		description: "Sets a function in the entity's script to rerun by itself constantly. Pass null as the function name to remove a think function."
	},
	AddToScriptHelp: {
		signature: "AddToScriptHelp()"
	},
	Assert: {
		signature: "Assert(value: bool, optional_message: string) -> null",
		description: "Test value and if not true, throws exception, optionally with message."
	},
	ClearGameEventCallbacks: {
		signature: "ClearGameEventCallbacks() -> null",
		description: "Empties the tables of game event callback functions."
	},
	CreateProp: {
		signature: "CreateProp(classname: string, origin: Vector, model_name: string, activity: int) -> handle",
		description: "Create a prop."
	},
	CreateSceneEntity: {
		signature: "CreateSceneEntity(scene: string) -> handle",
		description: "Create a scene entity to play the specified scene."
	},
	developer: {
		signature: "developer() -> int",
		description: "The current level of the `developer` console variable."
	},
	DispatchParticleEffect: {
		signature: "DispatchParticleEffect(name: string, origin: Vector, direction: Vector) -> null",
		description: "Dispatches a one-off particle system. To pass angles into this, use the `.Forward()` method on a QAngle."
	},
	Document: {
		signature: "Document(symbol_or_table: unknown, item_if_symbol: unknown = null, description_if_symbol: string = null) -> null"
	},
	DoEntFire: {
		signature: "DoEntFire(target: string, action: string, value: string, delay: float, activator: handle, caller: handle) -> null",
		description: "Generate an entity I/O event. The `caller` and `activator` argument takes a `CBaseEntity` script handle, and entities assigned can receive inputs with `target` set to *!self*, or *!activator* / *!caller*. Negative delays are clamped to 0."
	},
	DoIncludeScript: {
		signature: "DoIncludeScript(file: string, handle/scope: table) -> bool",
		description: "Execute a script and put all its content for the argument passed to the `scope` parameter. The file must have the `.nut` extension."
	},
	IncludeScript: {
		signature: "IncludeScript(file: string, scope: table = null) -> bool",
		description: "Wrapper for DoIncludeScript."
	},
	EmitAmbientSoundOn: {
		signature: "EmitAmbientSoundOn(sound_name: string, volume: float, soundlevel: int, pitch: int, entity: handle) -> null",
		description: "Play named sound on an entity using configurations similar to [this page](https://developer.valvesoftware.com/wiki/ambient_generic]]. Soundlevel is in decibels, see [Soundscripts#SoundLevel](https://developer.valvesoftware.com/wiki/Soundscripts#SoundLevel) for real world equivalents."
	},
	StopAmbientSoundOn: {
		signature: "StopAmbientSoundOn(sound_name: string, entity: handle) -> null",
		description: "Stop named sound on an entity using configurations similar to [ambient_generic](https://developer.valvesoftware.com/wiki/ambient_generic)."
	},
	EmitSoundOn: {
		signature: "EmitSoundOn(sound_script: string, entity: handle) -> null",
		description: "Play named sound on given entity. The sound must be precached first for it to play (using `PrecacheSound` or `PrecacheScriptSound`)."
	},
	StopSoundOn: {
		signature: "StopSoundOn(sound_script: string, entity: handle) -> null",
		description: "Stop named sound on an entity."
	},
	EmitSoundOnClient: {
		signature: "EmitSoundOnClient(sound_script: string, player: handle) -> null",
		description: "Play named sound only on the client for the specified player. The sound must be precached first for it to play (`PrecacheScriptSound`)."
	},
	EntFire: {
		signature: "EntFire(target: string, action: string, value: string = \"\", delay: float = 0.0, activator: handle = null) -> null",
		description: "Wrapper for DoEntFire() that sets `activator` to null, but has no `caller` param. Negative delays are clamped to 0."
	},
	EntFireByHandle: {
		signature: "EntFireByHandle(entity: handle, action: string, value: string, delay: float, activator: handle, caller: handle) -> null",
		description: "Generate an entity I/O event. First parameter is an entity instance. Negative delays are clamped to 0."
	},
	EntIndexToHScript: {
		signature: "EntIndexToHScript(entindex: int) -> handle",
		description: "Turn an entity index integer to an HScript representing that entity's script instance."
	},
	FileToString: {
		signature: "FileToString(file: string) -> string",
		description: "Reads a string from file located in the game's *scriptdata* folder. Returns the string from the file, null if no file or file is greater than 16384 bytes."
	},
	FindCircularReference: {
		signature: "FindCircularReference()"
	},
	FindCircularReferences: {
		signature: "FindCircularReferences()"
	},
	FireGameEvent: {
		signature: "FireGameEvent(name: string, params: table) -> bool",
		description: "Fire a game event to a listening callback function in script. Parameters are passed in a squirrel table."
	},
	FireScriptHook: {
		signature: "FireScriptHook(name: string, params: table) -> bool",
		description: "Fire a script hook to a listening callback function in script. Parameters are passed in a squirrel table."
	},
	FireScriptEvent: {
		signature: "FireScriptEvent(event: string, params: table) -> null",
		description: "Wrapper for `__RunEventCallbacks()`."
	},
	FrameTime: {
		signature: "FrameTime() -> float",
		description: "Get the time spent on the server in the last frame. Usually this will be 0.015 (the default tickrate)."
	},
	GetDeveloperLevel: {
		signature: "GetDeveloperLevel() -> int",
		description: "Gets the level of `developer`."
	},
	GetFrameCount: {
		signature: "GetFrameCount() -> int",
		description: "Returns the engines current frame count. The counter does not reset between map changes. This is NOT the tick count."
	},
	GetFriction: {
		signature: "GetFriction(player: handle) -> float",
		description: "Returns the Friction on a player entity, meaningless if not a player."
	},
	GetFunctionSignature: {
		signature: "GetFunctionSignature(func: function, prefix: string) -> string"
	},
	GetListenServerHost: {
		signature: "GetListenServerHost() -> handle",
		description: "Get the local player on a listen server. Returns null on dedicated servers."
	},
	GetMapName: {
		signature: "GetMapName() -> string",
		description: "Get the name of the map without extension, e.g. `ctf_2fort`. For workshop maps, this will be in the format `workshop/[name].ugc[id]`."
	},
	GetModelIndex: {
		signature: "GetModelIndex(model_name: string) -> int",
		description: "Returns the index of the named model."
	},
	GetPlayerFromUserID: {
		signature: "GetPlayerFromUserID(userid: int) -> handle",
		description: "Given a user id, return the entity, or null."
	},
	GetSoundDuration: {
		signature: "GetSoundDuration(sound_name: string, actor_model_name: string) -> float",
		description: "Returns float duration of the sound. Actor model name is optional and can be left null."
	},
	IsDedicatedServer: {
		signature: "IsDedicatedServer() -> bool",
		description: "Returns true if this server is a dedicated server."
	},
	IsModelPrecached: {
		signature: "IsModelPrecached(model_name: string) -> bool",
		description: "Checks if the `model_name` is precached."
	},
	IsSoundPrecached: {
		signature: "IsSoundPrecached(sound_name: string) -> bool",
		description: "Checks if the `sound_name` is precached."
	},
	IsPlayerABot: {
		signature: "IsPlayerABot(player: handle) -> bool",
		description: "Is this player/entity a puppet or AI bot. To check if the player is a AI bot (`CTFBot`) specifically, use `IsBotOfType` instead."
	},
	IsWeakref: {
		signature: "IsWeakref() -> bool"
	},
	LocalTime: {
		signature: "LocalTime(result: table) -> null",
		description: "Fills out a table with the local time (second, minute, hour, day, month, year, dayofweek, dayofyear, daylightsavings). This mirrors the `tm` structure in C++, see the [https://cplusplus.com/reference/ctime/tm/ reference page] for more information."
	},
	MakeNamespace: {
		signature: "MakeNamespace()"
	},
	MaxClients: {
		signature: "MaxClients() -> float",
		description: "Get the current number of max clients set by the maxplayers command."
	},
	PickupObject: {
		signature: "PickupObject(player: handle, entity: handle) -> null",
		description: "Object from world is put into the \"Held\" slot of the player. Warning: it will smoothly interpolate from where it is to the players hand - which is a bit goofy if it is on other side of level."
	},
	PlayerInstanceFromIndex: {
		signature: "PlayerInstanceFromIndex(index: int) -> CBasePlayer",
		description: "Get a script handle of a player using the player index."
	},
	PrecacheEntityFromTable: {
		signature: "PrecacheEntityFromTable(keyvalues: table) -> bool",
		description: "Precache an entity from [KeyValues](https://developer.valvesoftware.com/wiki/KeyValues) in a table. Internally this function creates the entity, fire `DispatchSpawn` and removes it instantly. Returns false if the table has no *classname* key, if the value of *classname* is null or empty, or if the entity failed to be created."
	},
	PrecacheModel: {
		signature: "PrecacheModel(model_name: string) -> int",
		description: "Precache a model (`.mdl`) or sprite (`.vmt`) and return model index. The extension must be specified. Returns -1 if null or empty `model_name` is passed in. Missing models/sprites will still return a new index."
	},
	PrecacheScriptSound: {
		signature: "PrecacheScriptSound(sound_name: string) -> bool",
		description: "Precache a soundscript. Returns false if soundscript is missing, or if a null or empty sound name is passed in."
	},
	PrecacheSound: {
		signature: "PrecacheSound(sound_name: string) -> bool",
		description: "Precache a raw sound. Returns false if a null or empty sound name is passed in."
	},
	PrintHelp: {
		signature: "PrintHelp() -> null",
		description: "Equivalent to running `script_help` command."
	},
	RandomFloat: {
		signature: "RandomFloat(min: float, max: float) -> float",
		description: "Generate a random floating-point number within a range, inclusive."
	},
	RandomInt: {
		signature: "RandomInt(min: int, max: int) -> int",
		description: "Generate a random integer within a range, inclusive."
	},
	RegisterFunctionDocumentation: {
		signature: "RegisterFunctionDocumentation(func: unknown, name: string, signature: string, description: string) -> null"
	},
	RegisterScriptGameEventListener: {
		signature: "RegisterScriptGameEventListener(event_name: string) -> null",
		description: "Register as a listener for a game event from script. It's what `__CollectGameEventCallbacks()` uses to register event callbacks to the C++ code."
	},
	RegisterScriptHookListener: {
		signature: "RegisterScriptHookListener(name: string) -> null",
		description: "Register as a listener for a script hook from script."
	},
	RetrieveNativeSignature: {
		signature: "RetrieveNativeSignature(func: function) -> string"
	},
	RotateOrientation: {
		signature: "RotateOrientation(QAngle, QAngle) -> QAngle",
		description: "Rotate a QAngle by another QAngle."
	},
	RotatePosition: {
		signature: "RotatePosition(origin: Vector, rotation: QAngle, input: Vector) -> Vector",
		description: "Rotate the input Vector around an origin."
	},
	ScreenFade: {
		signature: "ScreenFade(player: handle, red: int, green: int, blue: int, alpha: int, fade_time: float, fade_hold: float, flags: FFADE) -> null",
		description: "Start a customisable screenfade. If no player is specified, the fade will apply to all players.\n\nSee [FFADE](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FFADE)"
	},
	ScreenShake: {
		signature: "ScreenShake(center: Vector, amplitude: float, frequency: float, duration: float, radius: float, command: SHAKE_COMMAND, air_shake: bool) -> null",
		description: "Start a customisable screenshake. Set `command` to 0 to start a shake, or 1 to stop an existing shake. `air_shake` determines whether the airborne players should be affected by the shake as well.\n\nSee [SHAKE_COMMAND](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#SHAKE_COMMAND)"
	},
	ScriptHooksEnabled: {
		signature: "ScriptHooksEnabled() -> bool",
		description: "Returns whether script hooks are currently enabled."
	},
	SendGlobalGameEvent: {
		signature: "SendGlobalGameEvent(event_name: string, params: table) -> bool",
		description: "Sends a real game event to everything. Parameters are passed in a squirrel table."
	},
	SendToConsole: {
		signature: "SendToConsole(command: string) -> null",
		description: "Issues a command to the local client, as if they typed in the command in their console. Does nothing on dedicated servers."
	},
	SendToServerConsole: {
		signature: "SendToServerConsole(command: string) -> null",
		description: "Issues a command to the server, as if typed in the console."
	},
	SendToConsoleServer: {
		signature: "SendToConsoleServer(command: string) -> null",
		description: "Copy of SendToServerConsole with another name for compat."
	},
	SetFakeClientConVarValue: {
		signature: "SetFakeClientConVarValue(bot: handle, cvar: string, value: string) -> null",
		description: "Sets a USERINFO client ConVar for a fakeclient."
	},
	SetSkyboxTexture: {
		signature: "SetSkyboxTexture(texture: string) -> null",
		description: "Sets the current skybox texture. The path is relative to \"materials/skybox/\". Only the main name of a skybox texture is needed, for example \"sky_gravel_01\"."
	},
	SpawnEntityFromTable: {
		signature: "SpawnEntityFromTable(name: string, keyvalues: table) -> handle",
		description: "Spawn entity from KeyValues in table - `name` is entity name, rest are KeyValues for spawn."
	},
	SpawnEntityGroupFromTable: {
		signature: "SpawnEntityGroupFromTable(groups: table) -> bool",
		description: "Hierarchically spawn an entity group from a set of spawn tables. This computes a spawn order for entities so that parenting is resolved correctly."
	},
	StringToFile: {
		signature: "StringToFile(file: string, string: string) -> null",
		description: "Stores a string as a file, located in the game's *scriptdata* folder."
	},
	Time: {
		signature: "Time() -> float",
		description: "Get the current time since map load in seconds. The time resets on map change."
	},
	TraceLine: {
		signature: "TraceLine(start: Vector, end: Vector, ignore: handle) -> float",
		description: "Trace a ray. Return fraction along line that hits world or models. Optionally, ignore the specified entity."
	},
	TraceLinePlayersIncluded: {
		signature: "TraceLinePlayersIncluded(start: Vector, end: Vector, ignore: handle) -> float",
		description: "Different version of `TraceLine` that also hits players and NPCs."
	},
	TraceLineEx: {
		signature: "TraceLineEx(params: table) -> bool",
		description: {
			"Extended version of `TraceLine`. See the [main page](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/TraceLineEx) for more details.": false,
			"\n\n---\nInput variables of the `params` table. The only required information to make the trace is providing the start and end point. The rest are optional:": false,
			"start: Vector — Point where to start the trace, in world coordinates.": true,
			"end: Vector — Point where to end the trace, in world coordinates. If the end is the same as the start, this will function as a point check, i.e. is the point inside any geometry.": true,
			"mask: int": true,
			"Optional contents bitmask to include or exclude common groups of geometry, such as fences, NPCs, playerclips, etc. Default mask is `MASK_VISIBLE_AND_NPCS`. See constants page for a list of [contents](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FContents) and [common mask](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#MASK) types. By default this will trace against the bounding box of models only. Add `CONTENTS_HITBOX` to the mask to instead perform precise hitbox tests": false,
			"ignore: handle": true,
			"Optional entity to ignore when tracing. [worldspawn](https://developer.valvesoftware.com/wiki/worldspawn) cannot be ignored.": false,
			"\n\n---\nOutput variables of the `params` table:": false,
			"pos: Vector — Point in world coordinates where the trace ended. Equal to end position if nothing was hit.": true,
			"fraction: float — Fraction from the start to end where the trace ended. E.g. 0.0 is start, 1.0 is end.": true,
			"hit: bool — Whether the trace hit something.": true,
			"enthit: handle — If hit, the entity that was hit. This is not written to the table if hit was false.": true,
			"startsolid: bool — Whether the trace started inside geometry. Only written if true.": true,
			"allsolid: bool — If true, plane information is unavailable (started and ended inside geometry or didn't hit anything). Only written if true.": true,
			"startpos: Vector — Starting position of the trace in world coordinates. Probably the same as start.": true,
			"endpos: Vector — Ending position of the trace in world coordinates. Same as end if it didn't hit anything, otherwise this is the hit point.": true,
			"plane_normal: Vector — If hit, the normal (unit) vector of the surface.": true,
			"plane_dist: float — If hit, distance of surface plane from origin. Forms a plane equation with plane_normal.": true,
			"surface_name: string — If hit, name of the surface's texture that was hit. Not available for displacements or models.": true,
			"surface_flags: int": true,
			"If hit, bitmask of the surface flags. See [FSurf](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FSurf) constants.": false,
			"surface_props: int": true,
			"If hit, the [surfaceprop](https://developer.valvesoftware.com/wiki/surfaceprop) of the surface. Note that this is an index rather than a string.": false
		}
	},
	TraceHull: {
		signature: "TraceHull(params: table) -> bool",
		description: {
			"Trace a [box (AABB)](https://developer.valvesoftware.com/wiki/Bounding_Box). See the [main page](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/TraceHull) for more details.": false,
			"\n\n---\nInput variables of the `params` table. The only required information to make the trace is providing the start, end points and the min/max extents. The rest are optional:": false,
			"start: Vector — Point where to start the trace, in world coordinates.": true,
			"end: Vector — Point where to end the trace, in world coordinates. If the end is the same as the start, this will function as a point check, i.e. is the point inside any geometry.": true,
			"hullmin: Vector — The minimum extent of the box, relative to the start position.": true,
			"hullmax: Vector — The maximum extent of the box, relative to the start position.": true,
			"mask: int": true,
			"Optional contents bitmask to include or exclude common groups of geometry, such as fences, NPCs, playerclips, etc. Default mask is `MASK_VISIBLE_AND_NPCS`. See constants page for a list of [contents](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FContents) and [common mask](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#MASK) types. `CONTENTS_HITBOX` is not supported.": false,
			"ignore: handle": true,
			"Optional entity to ignore when tracing. [worldspawn](https://developer.valvesoftware.com/wiki/worldspawn) cannot be ignored.": false,
			"\n\n---\nOutput variables of the `params` table:": false,
			"pos: Vector — Point in world coordinates where the trace ended. Equal to end position if nothing was hit.": true,
			"fraction: float — Fraction from the start to end where the trace ended. E.g. 0.0 is start, 1.0 is end.": true,
			"hit: bool — Whether the trace hit something.": true,
			"enthit: handle — If hit, the entity that was hit. This is not written to the table if hit was false.": true,
			"startsolid: bool — Whether the trace started inside geometry. Only written if true.": true,
			"allsolid: bool — If true, plane information is unavailable (started and ended inside geometry or didn't hit anything). Only written if true.": true,
			"startpos: Vector — Starting position of the trace in world coordinates. Probably the same as start.": true,
			"endpos: Vector — Ending position of the trace in world coordinates. Same as end if it didn't hit anything, otherwise this is the hit point.": true,
			"plane_normal: Vector — If hit, the normal (unit) vector of the surface.": true,
			"plane_dist: float — If hit, distance of surface plane from origin. Forms a plane equation with plane_normal.": true,
			"surface_name: string — If hit, name of the surface's texture that was hit. Not available for displacements or models.": true,
			"surface_flags: int": true,
			"If hit, bitmask of the surface flags. See [FSurf](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FSurf) constants.": false,
			"surface_props: int": true,
			"If hit, the [surfaceprop](https://developer.valvesoftware.com/wiki/surfaceprop) of the surface. Note that this is an index rather than a string.": false
		}
	},
	UniqueString: {
		signature: "UniqueString(suffix: string = \"\") -> string",
		description: "Generate a string guaranteed to be unique across the life of the script VM, with an optional suffix. Useful for adding data to tables when not sure what keys are already in use in that table."
	},
	DoUniqueString: {
		signature: "DoUniqueString(suffix: string) -> string",
		description: "Internal function called by `UniqueString`."
	},
	VSquirrel_OnCreateScope: {
		signature: "VSquirrel_OnCreateScope(value: any, scope: table) -> table",
		description: "Creates a new scope with the name of value in the submitted table (includes unique params)."
	},
	VSquirrel_OnReleaseScope: {
		signature: "VSquirrel_OnReleaseScope(created_scope: table) -> null",
		description: "Removes a scope created via VSquirrel_OnCreateScope."
	},
	__CollectEventCallbacks: {
		signature: "__CollectEventCallbacks(scope, prefix, global_table_name, reg_func) -> null",
		description: "Overloaded function. Its only used for this: `__CollectEventCallbacks(scope, \"OnGameEvent_\", \"GameEventCallbacks\", ::RegisterScriptGameEventListener)`."
	},
	__CollectGameEventCallbacks: {
		signature: "__CollectGameEventCallbacks(scope: table) -> null",
		description: "Wrapper that registers callbacks for both [OnGameEvent_*x* ↑](https://developer.valvesoftware.com/wiki/#Hooks) and `OnScriptEvent_` functions. Done using the `__CollectEventCallbacks` function."
	},
	__ReplaceClosures: {
		signature: "__ReplaceClosures(script, scope) -> null"
	},
	__RunEventCallbacks: {
		signature: "__RunEventCallbacks(event, params, prefix, global_table_name, warn_if_missing: bool) -> null",
		description: "Call all functions in the callback array for the given game event."
	},
	__RunGameEventCallbacks: {
		signature: "__RunGameEventCallbacks(event, params) -> null",
		description: "Wrapper for `__RunEventCallbacks()`."
	},
	__RunScriptHookCallbacks: {
		signature: "__RunScriptHookCallbacks(event, param) -> null"
	},
	AllowThirdPersonCamera: {
		signature: "AllowThirdPersonCamera() -> bool"
	},
	ArePlayersInHell: {
		signature: "ArePlayersInHell() -> bool"
	},
	FlagsMayBeCapped: {
		signature: "FlagsMayBeCapped() -> bool",
		description: "May a flag be captured?"
	},
	ForceEnableUpgrades: {
		signature: "ForceEnableUpgrades(state: int) -> null",
		description: "Whether to force on MvM-styled upgrades on/off. 0 -> default, 1 -> force off, 2 -> force on."
	},
	ForceEscortPushLogic: {
		signature: "ForceEscortPushLogic(state: int) -> null",
		description: "Forces payload pushing logic. 0 -> default, 1 -> force off, 2 -> force on."
	},
	GameModeUsesCurrency: {
		signature: "GameModeUsesCurrency() -> bool",
		description: "Does the current gamemode have currency?"
	},
	GameModeUsesMiniBosses: {
		signature: "GameModeUsesMiniBosses() -> bool",
		description: "Does the current gamemode have minibosses?"
	},
	GameModeUsesUpgrades: {
		signature: "GameModeUsesUpgrades() -> bool",
		description: "Does the current gamemode have upgrades?"
	},
	GetClassLimit: {
		signature: "GetClassLimit(class: ETFClass) -> int",
		description: "Get class limit for class.\n\nSee [ETFClass](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFClass)"
	},
	GetGravityMultiplier: {
		signature: "GetGravityMultiplier() -> float"
	},
	GetMannVsMachineAlarmStatus: {
		signature: "GetMannVsMachineAlarmStatus() -> bool"
	},
	GetOvertimeAllowedForCTF: {
		signature: "GetOvertimeAllowedForCTF() -> bool"
	},
	GetRoundState: {
		signature: "GetRoundState() -> int",
		description: "Get current round state. See [Constants.ERoundState](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ERoundState)."
	},
	GetStopWatchState: {
		signature: "GetStopWatchState() -> int",
		description: "Get the current stopwatch state. See [Constants.EStopwatchState](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#EStopwatchState)."
	},
	GetWinningTeam: {
		signature: "GetWinningTeam() -> int",
		description: "Who won!"
	},
	HaveStopWatchWinner: {
		signature: "HaveStopWatchWinner() -> bool"
	},
	InMatchStartCountdown: {
		signature: "InMatchStartCountdown() -> bool",
		description: "Are we in the pre-match/setup state?"
	},
	InOvertime: {
		signature: "InOvertime() -> bool",
		description: "Currently in overtime?"
	},
	IsAttackDefenseMode: {
		signature: "IsAttackDefenseMode() -> bool"
	},
	IsBirthday: {
		signature: "IsBirthday() -> bool",
		description: "Are we in birthday mode?"
	},
	IsCompetitiveMode: {
		signature: "IsCompetitiveMode() -> bool",
		description: "Playing competitive?"
	},
	IsDefaultGameMode: {
		signature: "IsDefaultGameMode() -> bool",
		description: "The absence of arena, mvm, tournament mode, etc."
	},
	IsHolidayActive: {
		signature: "IsHolidayActive(holiday: EHoliday) -> bool",
		description: "Is the given holiday active?\n\nSee [EHoliday](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#EHoliday)"
	},
	IsHolidayMap: {
		signature: "IsHolidayMap(holiday: EHoliday) -> bool",
		description: "Playing a holiday map?\n\nSee [EHoliday](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#EHoliday)"
	},
	IsInArenaMode: {
		signature: "IsInArenaMode() -> bool",
		description: "Playing arena mode?"
	},
	IsInKothMode: {
		signature: "IsInKothMode() -> bool",
		description: "Playing king of the hill mode?"
	},
	IsInMedievalMode: {
		signature: "IsInMedievalMode() -> bool",
		description: "Playing medieval mode?"
	},
	IsInWaitingForPlayers: {
		signature: "IsInWaitingForPlayers() -> bool",
		description: "Are we waiting for some stragglers?"
	},
	IsMannVsMachineMode: {
		signature: "IsMannVsMachineMode() -> bool",
		description: "Playing MvM? Beep boop."
	},
	IsMannVsMachineRespecEnabled: {
		signature: "IsMannVsMachineRespecEnabled() -> bool",
		description: "Are players allowed to refund their upgrades?"
	},
	IsMatchTypeCasual: {
		signature: "IsMatchTypeCasual() -> bool",
		description: "Playing casual?"
	},
	IsMatchTypeCompetitive: {
		signature: "IsMatchTypeCompetitive() -> bool",
		description: "Playing competitive?"
	},
	IsPasstimeMode: {
		signature: "IsPasstimeMode() -> bool",
		description: "No ball games."
	},
	IsPowerupMode: {
		signature: "IsPowerupMode() -> bool",
		description: "Playing powerup mode? Not compatible with MvM."
	},
	IsPVEModeActive: {
		signature: "IsPVEModeActive() -> bool"
	},
	IsQuickBuildTime: {
		signature: "IsQuickBuildTime() -> bool",
		description: "If an engie places a building, will it immediately upgrade? Eg. MvM pre-round etc."
	},
	IsTruceActive: {
		signature: "IsTruceActive() -> bool"
	},
	IsUsingGrapplingHook: {
		signature: "IsUsingGrapplingHook() -> bool"
	},
	IsUsingSpells: {
		signature: "IsUsingSpells() -> bool"
	},
	MapHasMatchSummaryStage: {
		signature: "MapHasMatchSummaryStage() -> bool"
	},
	MatchmakingShouldUseStopwatchMode: {
		signature: "MatchmakingShouldUseStopwatchMode() -> bool"
	},
	PlayerReadyStatus_ArePlayersOnTeamReady: {
		signature: "PlayerReadyStatus_ArePlayersOnTeamReady(team: ETFTeam) -> bool",
		description: "See [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)"
	},
	PlayerReadyStatus_HaveMinPlayersToEnable: {
		signature: "PlayerReadyStatus_HaveMinPlayersToEnable() -> bool"
	},
	PlayerReadyStatus_ResetState: {
		signature: "PlayerReadyStatus_ResetState() -> null"
	},
	PlayersAreOnMatchSummaryStage: {
		signature: "PlayersAreOnMatchSummaryStage() -> bool"
	},
	PointsMayBeCaptured: {
		signature: "PointsMayBeCaptured() -> bool",
		description: "Are points able to be captured?"
	},
	SetGravityMultiplier: {
		signature: "SetGravityMultiplier(multiplier: float) -> null"
	},
	SetMannVsMachineAlarmStatus: {
		signature: "SetMannVsMachineAlarmStatus(status: bool) -> null"
	},
	SetOvertimeAllowedForCTF: {
		signature: "SetOvertimeAllowedForCTF(state: bool) -> null"
	},
	SetPlayersInHell: {
		signature: "SetPlayersInHell(state: bool) -> null"
	},
	SetUsingSpells: {
		signature: "SetUsingSpells(state: bool) -> null"
	},
	UsePlayerReadyStatusMode: {
		signature: "UsePlayerReadyStatusMode() -> bool"
	},
	ClientPrint: {
		signature: "ClientPrint(player: CBasePlayer, destination: EHudNotify, message: string) -> null",
		description: "Print a client message. If you pass null instead of a valid player, the message will be sent to all clients.\n\nSee [EHudNotify](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#EHudNotify)"
	},
	DebugDrawBox: {
		signature: "DebugDrawBox(origin: Vector, min: Vector, max: Vector, r: int, g: int, b: int, alpha: int, duration: float) -> null",
		description: "Draw a debug overlay box."
	},
	DebugDrawBoxAngles: {
		signature: "DebugDrawBoxAngles(origin: Vector, min: Vector, max: Vector, direction: QAngle, rgb: Vector, alpha: int, duration: float) -> null",
		description: "Draw a debug oriented box."
	},
	DebugDrawBoxDirection: {
		signature: "DebugDrawBoxDirection(center: Vector, min: Vector, max: Vector, forward: Vector, rgb: Vector, alpha: float, duration: float) -> null",
		description: "Draw a debug forward box."
	},
	DebugDrawCircle: {
		signature: "DebugDrawCircle(center: Vector, rgb: Vector, alpha: float, radius: float, ztest: bool, duration: float) -> null",
		description: "Draw a debug circle."
	},
	DebugDrawClear: {
		signature: "DebugDrawClear() -> null",
		description: "Try to clear all the debug overlay info."
	},
	DebugDrawLine: {
		signature: "DebugDrawLine(start: Vector, end: Vector, red: int, green: int, blue: int, z_test: bool, time: float) -> null",
		description: "Draw a debug overlay line."
	},
	DebugDrawLine_vCol: {
		signature: "DebugDrawLine_vCol(start: Vector, end: Vector, rgb: Vector, ztest: bool, duration: float) -> null",
		description: "Draw a debug line using color vec."
	},
	DebugDrawScreenTextLine: {
		signature: "DebugDrawScreenTextLine(x: float, y: float, line_offset: int, text: string, r: int, g: int, b: int, a: int, duration: float) -> null",
		description: "Draw text with a line offset."
	},
	DebugDrawText: {
		signature: "DebugDrawText(origin: Vector, text: string, use_view_check: bool, duration: float) -> null",
		description: "Draw text on the screen, starting on the position of `origin`."
	},
	__DumpScope: {
		signature: "__DumpScope(indentation: int, scope: table) -> null",
		description: "Dumps a scope's contents and expands all tables and arrays; this is what the `ent_script_dump` command uses."
	},
	DumpObject: {
		signature: "DumpObject(object: handle) -> null",
		description: "Dumps information about a class or instance."
	},
	Msg: {
		signature: "Msg(message: string) -> null",
		description: "Prints message to console without any line feed after."
	},
	printf: {
		signature: "printf(format: string, ...args: any) -> null",
		description: "Prints message to console with C style formatting. The line feed is not included."
	},
	printl: {
		signature: "printl(message: string) -> null",
		description: "Prints message to console with a line feed after."
	},
	realPrint: {
		signature: "realPrint(message: string) -> null",
		description: "Identical to print. print seems to be a wrapper for this."
	},
	Say: {
		signature: "Say(player: CBasePlayer, message: string, team_only: bool) -> null",
		description: "Calling this will have the specified player send the message to chat, either to team_only (true) or to everyone."
	},
	ShowMessage: {
		signature: "ShowMessage(message: string) -> null",
		description: "Displays a HUD message defined in `scripts/titles.txt` to all clients, similar to an [env_message](https://developer.valvesoftware.com/wiki/env_message) entity."
	},
	assert: {
		signature: "assert(exp: bool) -> bool",
		description: "Throws an assertion error if the given expression evaluates to `false` (i.e. the values <tt>0, 0.0, null</tt> and <tt>false</tt>)."
	},
	callee: {
		signature: "callee() -> function",
		description: "Returns the currently running closure."
	},
	castf2i: {
		signature: "castf2i(value: float) -> int",
		description: "Interprets the float's bytes as if it were a 32-bit integer representation."
	},
	casti2f: {
		signature: "casti2f(value: int) -> float",
		description: "Interprets the integer's bytes as if it were a floating-point encoding."
	},
	collectgarbage: {
		signature: "collectgarbage() -> int",
		description: "Runs the garbage collector and returns the number of reference cycles found(and deleted) This function only works on garbage collector builds."
	},
	compilestring: {
		signature: "compilestring(string: string, buffer_name: string = null) -> any",
		description: "Compiles a string containing a squirrel script into a function and returns it."
	}, /*
	dummy: {
		signature: "dummy() -> instance"
	}, */
	enabledebuginfo: {
		signature: "enabledebuginfo(enable: any) -> null",
		description: "Enable/disable the debug line information generation at compile time. enable != null enables . enable == null disables."
	},
	error: {
		signature: "error(x: string) -> null",
		description: "Prints x in the standard error output ."
	},
	getconsttable: {
		signature: "getconsttable() -> table",
		description: "Returns the const table of the VM."
	},
	getroottable: {
		signature: "getroottable() -> table",
		description: "Returns the root table of the VM."
	},
	getstackinfos: {
		signature: "getstackinfos(level: int) -> table",
		description: "Returns the stack frame informations at the given stack level (0 is the current function 1 is the caller and so on). If the stack level doesn't exist the function returns null."
	},
	newthread: {
		signature: "newthread(threadfunc: function) -> coroutine",
		description: "Creates a new cooperative thread object(coroutine) and returns it ."
	},
	print: {
		signature: "message: string) -> string",
		description: "Prints the given parameter but with no newline unlike `printl()`."
	},
	resurrectunreachable: {
		signature: "resurrectunreachable() -> array",
		description: "Runs the garbage collector and returns an array containing all unreachable object found. If no unreachable object is found, null is returned instead. This function is meant to help debugging reference cycles. This function only works on garbage collector builds."
	},
	setconsttable: {
		signature: "setconsttable(new_const: table) -> table",
		description: "Sets the const table of the VM which also returns the previous const table."
	},
	setdebughook: {
		signature: "setdebughook(hook_func: function) -> null",
		description: "Sets the debug hook."
	},
	seterrorhandler: {
		signature: "seterrorhandler(error_handler: function) -> null",
		description: "Sets the runtime error handler."
	},
	setroottable: {
		signature: "setroottable(new_root: table) -> table",
		description: "Sets the root table of the VM which also returns the previous root table."
	},
	suspend: {
		signature: "suspend(ret: any) -> null",
		description: "Suspends the coroutine that called this function."
	},
	swap2: {
		signature: "swap2(value: int) -> int",
		description: "Swaps bytes 1 and 2 of the integer."
	},
	swap4: {
		signature: "swap4(value: int) -> int",
		description: "Reverse byte order of the four bytes."
	},
	swapfloat: {
		signature: "swapfloat(value: float) -> float",
		description: "Reverse byte order of the four bytes."
	},
	type: {
		signature: "type(var)",
		description: "Returns var._typeof(), i.e. the type of the given parameter as a string"
	},
	abs: {
		signature: "abs(x: number) -> number",
		description: "Returns <nowiki>|x|</nowiki> as integer unlike `fabs()`."
	},
	acos: {
		signature: "acos(x: number) -> number",
		description: "Returns cos<sup>-1</sup>(x), -1 ≤ x ≤ 1."
	},
	asin: {
		signature: "asin(x: number) -> number",
		description: "Returns sin<sup>-1</sup>(x), -1 ≤ x ≤ 1."
	},
	atan: {
		signature: "atan(x: number) -> number",
		description: "Returns tan<sup>-1</sup>(x)."
	},
	atan2: {
		signature: "atan2(y: number, x: number) -> number",
		description: "Returns the angle between the ray from the point (0, 0) through (x, y) and the positive x-axis, confined to (−PI, PI], See also [atan2](https://en.wikipedia.org/wiki/Atan2). Note the order of the parameters x and y!]"
	},
	ceil: {
		signature: "ceil(x: number) -> number",
		description: "Returns the smallest integer that is ≥ x."
	},
	cos: {
		signature: "cos(x: number) -> number",
		description: "Returns cos(x)."
	},
	exp: {
		signature: "exp(x: number) -> number",
		description: "Returns exp(x) = e<sup>x</sup>."
	},
	fabs: {
		signature: "fabs(x: number) -> number",
		description: "Returns <nowiki>|x|</nowiki> as float unlike `abs()`."
	},
	floor: {
		signature: "floor(x: number) -> number",
		description: "Returns the largest integer that is ≤ x."
	},
	log: {
		signature: "log(x: number) -> number",
		description: "Returns log<sub>e</sub>(x) = ln(x)."
	},
	log10: {
		signature: "log10(x: number) -> number",
		description: "Returns log<sub>10</sub>(x)."
	},
	pow: {
		signature: "pow(x: number, y: number) -> number",
		description: "Returns x<sup>y</sup>."
	},
	rand: {
		signature: "rand()",
		description: "Returns a random integer with `0 ≤ rand() ≤ RAND_MAX`."
	},
	sin: {
		signature: "sin(x: number) -> number",
		description: "Returns sin(x)."
	},
	sqrt: {
		signature: "sqrt(x: number) -> number",
		description: "Returns the square root of x."
	},
	srand: {
		signature: "srand(seed: number) -> number",
		description: "Sets the starting point for generating a series of pseudorandom integers."
	},
	tan: {
		signature: "tan(x: number) -> number",
		description: "Returns tan(x)"
	},
	endswith: {
		signature: "endswith(str: string, cmp: string) -> bool",
		description: "Returns true if the end of the string matches the comparison string."
	},
	escape: {
		signature: "escape(str: string) -> string",
		description: "Returns a string with backslashes before characters that need to be escaped: `“ a b t n v f r \\ ” ’ 0 xNN`."
	},
	format: {
		signature: "format(format: string, ...args: any) -> string",
		description: "Returns a [formatted string](https://en.wikipedia.org/wiki/Printf). Same rules as the standard C functions (except * is not supported)."
	},
	lstrip: {
		signature: "lstrip(str: string) -> string",
		description: "Removes whitespace at the beginning of the given string."
	},
	rstrip: {
		signature: "rstrip(str: string) -> string",
		description: "Removes whitespace at the end of the given string."
	},
	split: {
		signature: "split(str: string, separator: string, skip_empty: bool = null) -> array",
		description: "Returns an array of strings split at each point where a separator character occurs in str. The separator is not returned as part of any array element. the parameter separators is a string that specifies the characters as to be used for the splitting. If skipempty is true, empty strings are not added to array."
	},
	startswith: {
		signature: "startswith(str: string, cmp: string) -> bool",
		description: "Returns true if the beginning of the string matches the comparison string."
	},
	strip: {
		signature: "strip(str: string) -> string",
		description: "Removes whitespace at the beginning and end of the given string"
	},
	BeginScriptDebug: {
		signature: "BeginScriptDebug() -> null"
	},
	EndScriptDebug: {
		signature: "EndScriptDebug() -> null"
	},
	ScriptDebugAddTextFilter: {
		signature: "ScriptDebugAddTextFilter() -> null"
	},
	ScriptDebugAddTrace: {
		signature: "ScriptDebugAddTrace() -> null"
	},
	ScriptDebugAddWatch: {
		signature: "ScriptDebugAddWatch() -> null"
	},
	ScriptDebugAddWatches: {
		signature: "ScriptDebugAddWatches() -> null"
	},
	ScriptDebugAddWatchPattern: {
		signature: "ScriptDebugAddWatchPattern() -> null"
	},
	ScriptDebugClearTraces: {
		signature: "ScriptDebugClearTraces() -> null"
	},
	ScriptDebugClearWatches: {
		signature: "ScriptDebugClearWatches() -> null"
	},
	ScriptDebugDefaultWatchColor: {
		signature: "ScriptDebugDefaultWatchColor() -> null"
	},
	ScriptDebugDraw: {
		signature: "ScriptDebugDraw() -> null"
	},
	ScriptDebugDrawWatches: {
		signature: "ScriptDebugDrawWatches() -> null"
	},
	ScriptDebugDumpKeys: {
		signature: "ScriptDebugDumpKeys() -> null"
	},
	ScriptDebugHook: {
		signature: "ScriptDebugHook() -> null"
	},
	ScriptDebugIterateKeys: {
		signature: "ScriptDebugIterateKeys() -> null"
	},
	ScriptDebugIterateKeysRecursive: {
		signature: "ScriptDebugIterateKeysRecursive() -> null"
	},
	ScriptDebugRemoveTextFilter: {
		signature: "ScriptDebugRemoveTextFilter() -> null"
	},
	ScriptDebugRemoveTrace: {
		signature: "ScriptDebugRemoveTrace() -> null"
	},
	ScriptDebugRemoveWatch: {
		signature: "ScriptDebugRemoveWatch() -> null"
	},
	ScriptDebugRemoveWatches: {
		signature: "ScriptDebugRemoveWatches() -> null"
	},
	ScriptDebugRemoveWatchPattern: {
		signature: "ScriptDebugRemoveWatchPattern() -> null"
	},
	ScriptDebugText: {
		signature: "ScriptDebugText() -> null"
	},
	ScriptDebugTextDraw: {
		signature: "ScriptDebugTextDraw() -> null"
	},
	ScriptDebugTextPrint: {
		signature: "ScriptDebugTextPrint() -> null"
	},
	ScriptDebugTextTrace: {
		signature: "ScriptDebugTextTrace() -> null"
	},
	ScriptDebugTraceAll: {
		signature: "ScriptDebugTraceAll() -> null"
	},
	ScriptDebugWatches: {
		signature: "ScriptDebugWatches() -> null"
	},
	__VScriptServerDebugHook: {
		signature: "__VScriptServerDebugHook()"
	},

	
	Vector: {
		signature: "Vector(x: float = 0.0, y: float = 0.0, z: float = 0.0) -> Vector",
		description: "Creates a new vector with the specified Cartesian coordiantes."
	},
	
	QAngle: {
		signature: "QAngle(pitch: float = 0.0, yaw: float = 0.0, roll: float = 0.0) -> QAngle",
		description: "Creates a new QAngle."
	},

	Quaternion: {
		signature: "Quaternion(x: float, y: float, z: float, w: float) -> Quaternion",
		description: "Creates a new quaternion of the form `w + xi + yj + zk`."
	}, 

	
	array: {
		signature: "array(length: int, fill: any = null) -> int",
		description: "Returns a new array of the given length where each element is set to `fill`."
	},
	/*
	 * Events
	 */
	Precache: {
		signature: "Precache() -> null",
		description: "Entity function that is called after the script executes, but before the entity is initialized. Can be used to call precache functions for models and sounds on map load."
	},
	ConnectOutputs: {
		signature: "ConnectOutputs(scope: table) -> null",
		description: "Global function called after an entity with an script assigned spawns (i.e. `vscripts` keyvalue is not blank). Unlike `OnPostSpawn`, this is called immediately and therefore on map respawn, some entities may not exist during this point."
	},
	OnPostSpawn: {
		signature: "OnPostSpawn() -> null",
		description: "Entity function called after the entity is spawned and initialized, at the end of the frame. When map entities are respawned, this effectively runs after all scripts, players etc have been loaded. This could be used to have an entity register itself with a master script, or adjusting the entity parameters in a programmatic way."
	},
	OnScriptHook_OnTakeDamage: {
		signature: "OnScriptHook_OnTakeDamage(params: table) -> null",
		description: {
			"Called each time an entity takes damage. The script can modify the table entries not prefixed with const, and these will be sent back to the game code.": false,
			"\n\n---\nVariables of the `params` table:": false,
			"const_entity: handle — The entity which took damage.": true,
			"inflictor: handle — The entity which dealt the damage, can be null.": true,
			"weapon: handle — The weapon which dealt the damage, can be null.": true,
			"attacker: handle — The owner of the damage, can be null.": true,
			"damage: float": true,
			"max_damage: float": true,
			"damage_bonus: float — Additional damage (e.g. from crits).": true,
			"damage_bonus_provider: handle — Owner of the damage bonus.": true,
			"const_base_damage: float": true,
			"damage_force: Vector": true,
			"damage_for_force_calc: float — This value does not seem to do anything.": true,
			"damage_position: Vector — World position of where the damage came from. E.g. end position of a bullet or a rocket.": true,
			"reported_position: Vector — World position of where the damage supposedly came from": true,
			"damage_type: int — Combination of damage types. See Constants.FDmgType.": true,
			"damage_custom: int — Because of a code oversight, this value is read-only.": true,
			"damage_stats: int — Special damage type. See Constants.ETFDmgCustom. Unlike damage_type, only one custom damage type can be set.": true,
			"force_friendly_fire: bool — If true, force the damage to friendlyfire, regardless of this entity's and attacker's team.": true,
			"ammo_type: int — Unused": true,
			"player_penetration_count: int — How many players the damage has penetrated so far.": true,
			"damaged_other_players: int — How many players other than the attacker has the damage been applied to. Used for rocket jump damage reduction.": true,
			"crit_type: int — Type of crit damage. 0 - None, 1 - Mini, 2 - Full. The numbers correspond to Constants.ECritType.": true,
			"early_out: bool — If set to true by the script, the game's damage routine will not run and it will simply return the currently set damage.": true,
		}
	},

	OnGameEvent_achievement_earned: {
		signature: "OnGameEvent_achievement_earned(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true,
			"achievement: int — achievement ID": true
		}
	},
	OnGameEvent_achievement_earned_local: {
		signature: "OnGameEvent_achievement_earned_local(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"achievement: int": true
		}
	},
	OnGameEvent_achievement_event: {
		signature: "OnGameEvent_achievement_event(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"achievement_name: string — non-localized name of achievement": true,
			"cur_val: int — # of steps toward achievement": true,
			"max_val: int — total # of steps in achievement": true
		}
	},
	OnGameEvent_achievement_increment: {
		signature: "OnGameEvent_achievement_increment(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"achievement_id: int — ID of achievement that went up": true,
			"cur_val: int — # of steps toward achievement": true,
			"max_val: int — total # of steps in achievement": true
		}
	},
	OnGameEvent_air_dash: {
		signature: "OnGameEvent_air_dash(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true
		}
	},
	OnGameEvent_ammo_pickup: {
		signature: "OnGameEvent_ammo_pickup(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"ammo_index: int": true,
			"amount: int": true,
			"total: int": true
		}
	},
	OnGameEvent_arena_match_maxstreak: {
		signature: "OnGameEvent_arena_match_maxstreak(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"team: int": true,
			"streak: int": true
		}
	},
	OnGameEvent_arena_player_notification: {
		signature: "OnGameEvent_arena_player_notification(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true,
			"message: int": true
		}
	},
	OnGameEvent_arena_round_start: {
		signature: "OnGameEvent_arena_round_start(params: table) -> null",
		description: "called when round is active, players can move"
	},
	OnGameEvent_arena_win_panel: {
		signature: "OnGameEvent_arena_win_panel(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"panel_style: int — for client to determine layout": true,
			"winning_team: int": true,
			"winreason: int — the reason the team won": true,
			"cappers: string — string where each character is a player index of someone that capped": true,
			"flagcaplimit: int — if win reason was flag cap limit, the value of the flag cap limit": true,
			"blue_score: int — red team score": true,
			"red_score: int — blue team score": true,
			"blue_score_prev: int — previous red team score": true,
			"red_score_prev: int — previous blue team score": true,
			"round_complete: int — is this a complete round, or the end of a mini-round": true,
			"player_1: int": true,
			"player_1_damage: int": true,
			"player_1_healing: int": true,
			"player_1_lifetime: int": true,
			"player_1_kills: int": true,
			"player_2: int": true,
			"player_2_damage: int": true,
			"player_2_healing: int": true,
			"player_2_lifetime: int": true,
			"player_2_kills: int": true,
			"player_3: int": true,
			"player_3_damage: int": true,
			"player_3_healing: int": true,
			"player_3_lifetime: int": true,
			"player_3_kills: int": true,
			"player_4: int": true,
			"player_4_damage: int": true,
			"player_4_healing: int": true,
			"player_4_lifetime: int": true,
			"player_4_kills: int": true,
			"player_5: int": true,
			"player_5_damage: int": true,
			"player_5_healing: int": true,
			"player_5_lifetime: int": true,
			"player_5_kills: int": true,
			"player_6: int": true,
			"player_6_damage: int": true,
			"player_6_healing: int": true,
			"player_6_lifetime: int": true,
			"player_6_kills: int": true
		}
	},
	OnGameEvent_arrow_impact: {
		signature: "OnGameEvent_arrow_impact(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"attachedEntity: int": true,
			"shooter: int": true,
			"boneIndexAttached: int": true,
			"bonePositionX: float": true,
			"bonePositionY: float": true,
			"bonePositionZ: float": true,
			"boneAnglesX: float": true,
			"boneAnglesY: float": true,
			"boneAnglesZ: float": true,
			"projectileType: int": true,
			"isCrit: bool": true
		}
	},
	OnGameEvent_base_player_teleported: {
		signature: "OnGameEvent_base_player_teleported(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int": true
		}
	},
	OnGameEvent_bonus_updated: {
		signature: "OnGameEvent_bonus_updated(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"numadvanced: int": true,
			"numbronze: int": true,
			"numsilver: int": true,
			"numgold: int": true
		}
	},
	OnGameEvent_break_breakable: {
		signature: "OnGameEvent_break_breakable(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int": true,
			"userid: int": true,
			"material: int — BREAK_GLASS, BREAK_WOOD, etc": true
		}
	},
	OnGameEvent_break_prop: {
		signature: "OnGameEvent_break_prop(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int": true,
			"userid: int": true
		}
	},
	OnGameEvent_browse_replays: {
		signature: "OnGameEvent_browse_replays(params: table) -> null"
	},
	OnGameEvent_building_healed: {
		signature: "OnGameEvent_building_healed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"building: int": true,
			"healer: int": true,
			"amount: int": true
		}
	},
	OnGameEvent_building_info_changed: {
		signature: "OnGameEvent_building_info_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"building_type: int": true,
			"object_mode: int": true,
			"remove: int": true
		}
	},
	OnGameEvent_cart_updated: {
		signature: "OnGameEvent_cart_updated(params: table) -> null"
	},
	OnGameEvent_christmas_gift_grab: {
		signature: "OnGameEvent_christmas_gift_grab(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true
		}
	},
	OnGameEvent_cl_drawline: {
		signature: "OnGameEvent_cl_drawline(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — index of the player": true,
			"panel: int — type of panel": true,
			"line: int — type of line": true,
			"x: float": true,
			"y: float": true
		}
	},
	OnGameEvent_client_beginconnect: {
		signature: "OnGameEvent_client_beginconnect(params: table) -> null",
		description: {
			"client tries to connect to server": false,
			"\n\n---\nVariables of the `params` table:": false,
			"address: string — Name we used to connect to the server": true,
			"ip: int": true,
			"port: int — server port": true,
			"source: string — what caused us to attempt this connection?  (blank for general command line, \"serverbrowser\", \"quickplay\", etc)": true
		}
	},
	OnGameEvent_client_connected: {
		signature: "OnGameEvent_client_connected(params: table) -> null",
		description: {
			"client has completed the challenge / handshake process and is in SIGNONSTATE_CONNECTED": false,
			"\n\n---\nVariables of the `params` table:": false,
			"address: string — Name we used to connect to the server": true,
			"ip: int": true,
			"port: int — server port": true
		}
	},
	OnGameEvent_client_disconnect: {
		signature: "OnGameEvent_client_disconnect(params: table) -> null",
		description: {
			"client side disconnect message": false,
			"\n\n---\nVariables of the `params` table:": false,
			"message: string — Why are we disconnecting?  This could be a localization token or an English-language string": true
		}
	},
	OnGameEvent_client_fullconnect: {
		signature: "OnGameEvent_client_fullconnect(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"address: string — Name we used to connect to the server": true,
			"ip: int": true,
			"port: int — server port": true
		}
	},
	OnGameEvent_competitive_stats_update: {
		signature: "OnGameEvent_competitive_stats_update(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — entindex of the player": true,
			"kills_rank: int — num std deviations above": true,
			"score_rank: int": true,
			"damage_rank: int": true,
			"healing_rank: int": true,
			"support_rank: int": true
		}
	},
	OnGameEvent_competitive_victory: {
		signature: "OnGameEvent_competitive_victory(params: table) -> null"
	},
	OnGameEvent_conga_kill: {
		signature: "OnGameEvent_conga_kill(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — entindex of the player": true
		}
	},
	OnGameEvent_controlpoint_endtouch: {
		signature: "OnGameEvent_controlpoint_endtouch(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true,
			"area: int — index of the control point area": true
		}
	},
	OnGameEvent_controlpoint_fake_capture: {
		signature: "OnGameEvent_controlpoint_fake_capture(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true,
			"int_data: int": true
		}
	},
	OnGameEvent_controlpoint_fake_capture_mult: {
		signature: "OnGameEvent_controlpoint_fake_capture_mult(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true,
			"int_data: int": true
		}
	},
	OnGameEvent_controlpoint_initialized: {
		signature: "OnGameEvent_controlpoint_initialized(params: table) -> null"
	},
	OnGameEvent_controlpoint_pulse_element: {
		signature: "OnGameEvent_controlpoint_pulse_element(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true
		}
	},
	OnGameEvent_controlpoint_starttouch: {
		signature: "OnGameEvent_controlpoint_starttouch(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true,
			"area: int — index of the control point area": true
		}
	},
	OnGameEvent_controlpoint_timer_updated: {
		signature: "OnGameEvent_controlpoint_timer_updated(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — index of the cap being updated": true,
			"time: float — time": true
		}
	},
	OnGameEvent_controlpoint_unlock_updated: {
		signature: "OnGameEvent_controlpoint_unlock_updated(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — index of the cap being updated": true,
			"time: float — time": true
		}
	},
	OnGameEvent_controlpoint_updatecapping: {
		signature: "OnGameEvent_controlpoint_updatecapping(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — index of the cap being updated": true
		}
	},
	OnGameEvent_controlpoint_updateimages: {
		signature: "OnGameEvent_controlpoint_updateimages(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — index of the cap being updated": true
		}
	},
	OnGameEvent_controlpoint_updatelayout: {
		signature: "OnGameEvent_controlpoint_updatelayout(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — index of the cap being updated": true
		}
	},
	OnGameEvent_controlpoint_updateowner: {
		signature: "OnGameEvent_controlpoint_updateowner(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — index of the cap being updated": true
		}
	},
	OnGameEvent_cross_spectral_bridge: {
		signature: "OnGameEvent_cross_spectral_bridge(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — userid of the player that crossed": true
		}
	},
	OnGameEvent_crossbow_heal: {
		signature: "OnGameEvent_crossbow_heal(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"healer: int — userid of the Healer": true,
			"target: int — userid of the player that got hit": true,
			"amount: int — amount that was healed": true
		}
	},
	OnGameEvent_ctf_flag_captured: {
		signature: "OnGameEvent_ctf_flag_captured(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"capping_team: int": true,
			"capping_team_score: int": true
		}
	},
	OnGameEvent_damage_mitigated: {
		signature: "OnGameEvent_damage_mitigated(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"mitigator: int — userid of the player who provided the mitigation": true,
			"damaged: int — userid of the player who took the damage": true,
			"amount: int — amount that was mitigated": true,
			"itemdefindex: int — defindex of the item that provided the mitigation": true
		}
	},
	OnGameEvent_damage_prevented: {
		signature: "OnGameEvent_damage_prevented(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"preventor: int — Who prevented the damage": true,
			"victim: int — Who took the damage that was prevented": true,
			"amount: int — How much got prevented": true,
			"condition: int — Which condition did the preventing": true
		}
	},
	OnGameEvent_damage_resisted: {
		signature: "OnGameEvent_damage_resisted(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int": true
		}
	},
	OnGameEvent_deadringer_cheat_death: {
		signature: "OnGameEvent_deadringer_cheat_death(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"spy: int — userid of the Spy that cheat the death": true,
			"attacker: int — userid of the player that caused the cheat death to happen": true
		}
	},
	OnGameEvent_demoman_det_stickies: {
		signature: "OnGameEvent_demoman_det_stickies(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the detonating player": true
		}
	},
	OnGameEvent_deploy_buff_banner: {
		signature: "OnGameEvent_deploy_buff_banner(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"buff_type: int — type of buff (skin index)": true,
			"buff_owner: int — user ID of the person who gets the banner": true
		}
	},
	OnGameEvent_doomsday_rocket_open: {
		signature: "OnGameEvent_doomsday_rocket_open(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"team: int — which team opened the rocket": true
		}
	},
	OnGameEvent_duck_xp_level_up: {
		signature: "OnGameEvent_duck_xp_level_up(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int — leveled up to what": true
		}
	},
	OnGameEvent_duel_status: {
		signature: "OnGameEvent_duel_status(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"killer: int": true,
			"score_type: int": true,
			"initiator: int": true,
			"target: int": true,
			"initiator_score: int": true,
			"target_score: int": true
		}
	},
	OnGameEvent_econ_inventory_connected: {
		signature: "OnGameEvent_econ_inventory_connected(params: table) -> null"
	},
	OnGameEvent_enter_vehicle: {
		signature: "OnGameEvent_enter_vehicle(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"vehicle: int — entindex of the vehicle": true
		}
	},
	OnGameEvent_entered_performance_mode: {
		signature: "OnGameEvent_entered_performance_mode(params: table) -> null"
	},
	OnGameEvent_entity_killed: {
		signature: "OnGameEvent_entity_killed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex_killed: int": true,
			"entindex_attacker: int": true,
			"entindex_inflictor: int": true,
			"damagebits: int": true
		}
	},
	OnGameEvent_environmental_death: {
		signature: "OnGameEvent_environmental_death(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"killer: int — index of the killer": true,
			"victim: int — index of the victim": true
		}
	},
	OnGameEvent_escape_hell: {
		signature: "OnGameEvent_escape_hell(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — userid of the player that escaped": true
		}
	},
	OnGameEvent_escaped_loot_island: {
		signature: "OnGameEvent_escaped_loot_island(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — userid of the escaping player": true
		}
	},
	OnGameEvent_escort_progress: {
		signature: "OnGameEvent_escort_progress(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"team: int — which team": true,
			"progress: float": true,
			"reset: bool": true
		}
	},
	OnGameEvent_escort_recede: {
		signature: "OnGameEvent_escort_recede(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"team: int — which team": true,
			"recedetime: float": true
		}
	},
	OnGameEvent_escort_speed: {
		signature: "OnGameEvent_escort_speed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"team: int — which team": true,
			"speed: int": true,
			"players: int": true
		}
	},
	OnGameEvent_eyeball_boss_escape_imminent: {
		signature: "OnGameEvent_eyeball_boss_escape_imminent(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int": true,
			"time_remaining: int": true
		}
	},
	OnGameEvent_eyeball_boss_escaped: {
		signature: "OnGameEvent_eyeball_boss_escaped(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int": true
		}
	},
	OnGameEvent_eyeball_boss_killed: {
		signature: "OnGameEvent_eyeball_boss_killed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int": true
		}
	},
	OnGameEvent_eyeball_boss_killer: {
		signature: "OnGameEvent_eyeball_boss_killer(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int": true,
			"player_entindex: int": true
		}
	},
	OnGameEvent_eyeball_boss_stunned: {
		signature: "OnGameEvent_eyeball_boss_stunned(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int": true,
			"player_entindex: int": true
		}
	},
	OnGameEvent_eyeball_boss_summoned: {
		signature: "OnGameEvent_eyeball_boss_summoned(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int": true
		}
	},
	OnGameEvent_fish_notice: {
		signature: "OnGameEvent_fish_notice(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID who died": true,
			"victim_entindex: int": true,
			"inflictor_entindex: int — ent index of inflictor (a sentry, for example)": true,
			"attacker: int — user ID who killed": true,
			"weapon: string — weapon name killer used": true,
			"weaponid: int — ID of weapon killed used": true,
			"damagebits: int — bits of type of damage": true,
			"customkill: int — type of custom kill": true,
			"assister: int — user ID of assister": true,
			"weapon_logclassname: string — weapon name that should be printed on the log": true,
			"stun_flags: int — victim's stun flags at the moment of death": true,
			"death_flags: int": true,
			"See [death flags](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TF_DEATH).": false,
			"silent_kill: bool": true,
			"assister_fallback: string — contains a string to use if \"assister\" is -1": true
		}
	},
	OnGameEvent_fish_notice__arm: {
		signature: "OnGameEvent_fish_notice__arm(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID who died": true,
			"victim_entindex: int": true,
			"inflictor_entindex: int — ent index of inflictor (a sentry, for example)": true,
			"attacker: int — user ID who killed": true,
			"weapon: string — weapon name killer used": true,
			"weaponid: int — ID of weapon killed used": true,
			"damagebits: int — bits of type of damage": true,
			"customkill: int — type of custom kill": true,
			"assister: int — user ID of assister": true,
			"weapon_logclassname: string — weapon name that should be printed on the log": true,
			"stun_flags: int — victim's stun flags at the moment of death": true,
			"death_flags: int": true,
			"See [death flags](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TF_DEATH).": false,
			"silent_kill: bool": true,
			"assister_fallback: string — contains a string to use if \"assister\" is -1": true
		}
	},
	OnGameEvent_flag_carried_in_detection_zone: {
		signature: "OnGameEvent_flag_carried_in_detection_zone(params: table) -> null"
	},
	OnGameEvent_flagstatus_update: {
		signature: "OnGameEvent_flagstatus_update(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the player who now has the flag": true,
			"entindex: int — ent index of flag": true
		}
	},
	OnGameEvent_flare_ignite_npc: {
		signature: "OnGameEvent_flare_ignite_npc(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int — entity ignited": true
		}
	},
	OnGameEvent_freezecam_started: {
		signature: "OnGameEvent_freezecam_started(params: table) -> null"
	},
	OnGameEvent_game_end: {
		signature: "OnGameEvent_game_end(params: table) -> null",
		description: {
			"a game ended": false,
			"\n\n---\nVariables of the `params` table:": false,
			"winner: int — winner team/user id": true
		}
	},
	OnGameEvent_game_init: {
		signature: "OnGameEvent_game_init(params: table) -> null",
		description: "sent when a new game is started"
	},
	OnGameEvent_game_message: {
		signature: "OnGameEvent_game_message(params: table) -> null",
		description: {
			"a message send by game logic to everyone": false,
			"\n\n---\nVariables of the `params` table:": false,
			"target: int — 0 = console, 1 = HUD": true,
			"text: string — the message text": true
		}
	},
	OnGameEvent_game_newmap: {
		signature: "OnGameEvent_game_newmap(params: table) -> null",
		description: {
			"send when new map is completely loaded": false,
			"\n\n---\nVariables of the `params` table:": false,
			"mapname: string — map name": true
		}
	},
	OnGameEvent_game_start: {
		signature: "OnGameEvent_game_start(params: table) -> null",
		description: {
			"a new game starts": false,
			"\n\n---\nVariables of the `params` table:": false,
			"roundslimit: int — max round": true,
			"timelimit: int — time limit": true,
			"fraglimit: int — frag limit": true,
			"objective: string — round objective": true
		}
	},
	OnGameEvent_gameui_activate: {
		signature: "OnGameEvent_gameui_activate(params: table) -> null"
	},
	OnGameEvent_gameui_activated: {
		signature: "OnGameEvent_gameui_activated(params: table) -> null"
	},
	OnGameEvent_gameui_hidden: {
		signature: "OnGameEvent_gameui_hidden(params: table) -> null"
	},
	OnGameEvent_gameui_hide: {
		signature: "OnGameEvent_gameui_hide(params: table) -> null"
	},
	OnGameEvent_gc_lost_session: {
		signature: "OnGameEvent_gc_lost_session(params: table) -> null"
	},
	OnGameEvent_gc_new_session: {
		signature: "OnGameEvent_gc_new_session(params: table) -> null"
	},
	OnGameEvent_halloween_boss_killed: {
		signature: "OnGameEvent_halloween_boss_killed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"boss: int — 1=HHH 2=Monoculus 3=Merasmus": true,
			"killer: int — userid of the killing player": true
		}
	},
	OnGameEvent_halloween_duck_collected: {
		signature: "OnGameEvent_halloween_duck_collected(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"collector: int — userid of the collecting player": true
		}
	},
	OnGameEvent_halloween_pumpkin_grab: {
		signature: "OnGameEvent_halloween_pumpkin_grab(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true
		}
	},
	OnGameEvent_halloween_skeleton_killed: {
		signature: "OnGameEvent_halloween_skeleton_killed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — userid of the player that killed the skeleton": true
		}
	},
	OnGameEvent_halloween_soul_collected: {
		signature: "OnGameEvent_halloween_soul_collected(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"intended_target: int — userid of the intended target": true,
			"collecting_player: int — userid of the player who picked up the soul": true,
			"soul_count: int — number of souls collected (gift boxes)": true
		}
	},
	OnGameEvent_helicopter_grenade_punt_miss: {
		signature: "OnGameEvent_helicopter_grenade_punt_miss(params: table) -> null"
	},
	OnGameEvent_hide_annotation: {
		signature: "OnGameEvent_hide_annotation(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"id: int": true
		}
	},
	OnGameEvent_hide_freezepanel: {
		signature: "OnGameEvent_hide_freezepanel(params: table) -> null"
	},
	OnGameEvent_hltv_changed_mode: {
		signature: "OnGameEvent_hltv_changed_mode(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"oldmode: int": true,
			"newmode: int": true,
			"obs_target: int": true
		}
	},
	OnGameEvent_hltv_changed_target: {
		signature: "OnGameEvent_hltv_changed_target(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"mode: int": true,
			"old_target: int": true,
			"obs_target: int": true
		}
	},
	OnGameEvent_host_quit: {
		signature: "OnGameEvent_host_quit(params: table) -> null"
	},
	OnGameEvent_intro_finish: {
		signature: "OnGameEvent_intro_finish(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true
		}
	},
	OnGameEvent_intro_nextcamera: {
		signature: "OnGameEvent_intro_nextcamera(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true
		}
	},
	OnGameEvent_inventory_updated: {
		signature: "OnGameEvent_inventory_updated(params: table) -> null"
	},
	OnGameEvent_item_found: {
		signature: "OnGameEvent_item_found(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true,
			"quality: int — quality of the item": true,
			"method: int — method by which we acquired the item": true,
			"itemdef: int — the item definition index": true,
			"isstrange: int": true,
			"isunusual: int": true,
			"wear: float": true
		}
	},
	OnGameEvent_item_pickup: {
		signature: "OnGameEvent_item_pickup(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true,
			"item: string": true
		}
	},
	OnGameEvent_item_schema_initialized: {
		signature: "OnGameEvent_item_schema_initialized(params: table) -> null"
	},
	OnGameEvent_items_acknowledged: {
		signature: "OnGameEvent_items_acknowledged(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"blocker: int — entindex of the blocker": true,
			"victim: int — entindex of the victim": true
		}
	},
	OnGameEvent_kill_in_hell: {
		signature: "OnGameEvent_kill_in_hell(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"killer: int — userid of the killer": true,
			"victim: int — userid of the victim": true
		}
	},
	OnGameEvent_kill_refills_meter: {
		signature: "OnGameEvent_kill_refills_meter(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — entindex of the player": true
		}
	},
	OnGameEvent_killed_capping_player: {
		signature: "OnGameEvent_killed_capping_player(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"cp: int — index of the point": true,
			"killer: int — index of the killer": true,
			"victim: int — index of the victim": true,
			"assister: int — index of the assister": true
		}
	},
	OnGameEvent_landed: {
		signature: "OnGameEvent_landed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true
		}
	},
	OnGameEvent_leave_vehicle: {
		signature: "OnGameEvent_leave_vehicle(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"vehicle: int — entindex of the vehicle": true
		}
	},
	OnGameEvent_lobby_updated: {
		signature: "OnGameEvent_lobby_updated(params: table) -> null"
	},
	OnGameEvent_localplayer_becameobserver: {
		signature: "OnGameEvent_localplayer_becameobserver(params: table) -> null"
	},
	OnGameEvent_localplayer_builtobject: {
		signature: "OnGameEvent_localplayer_builtobject(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"object: int — type of object built": true,
			"object_mode: int — used for teleporters: entrance vs. exit": true,
			"index: int — index of the object": true
		}
	},
	OnGameEvent_localplayer_changeclass: {
		signature: "OnGameEvent_localplayer_changeclass(params: table) -> null"
	},
	OnGameEvent_localplayer_changedisguise: {
		signature: "OnGameEvent_localplayer_changedisguise(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"disguised: bool": true
		}
	},
	OnGameEvent_localplayer_changeteam: {
		signature: "OnGameEvent_localplayer_changeteam(params: table) -> null"
	},
	OnGameEvent_localplayer_chargeready: {
		signature: "OnGameEvent_localplayer_chargeready(params: table) -> null",
		description: "local player has full medic charge"
	},
	OnGameEvent_localplayer_healed: {
		signature: "OnGameEvent_localplayer_healed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"amount: int": true
		}
	},
	OnGameEvent_localplayer_pickup_weapon: {
		signature: "OnGameEvent_localplayer_pickup_weapon(params: table) -> null"
	},
	OnGameEvent_localplayer_respawn: {
		signature: "OnGameEvent_localplayer_respawn(params: table) -> null"
	},
	OnGameEvent_localplayer_score_changed: {
		signature: "OnGameEvent_localplayer_score_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"score: int": true
		}
	},
	OnGameEvent_localplayer_winddown: {
		signature: "OnGameEvent_localplayer_winddown(params: table) -> null",
		description: "local player minigun winddown"
	},
	OnGameEvent_mainmenu_stabilized: {
		signature: "OnGameEvent_mainmenu_stabilized(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"attacker: int": true,
			"victim: int": true,
			"assister: int": true
		}
	},
	OnGameEvent_match_invites_updated: {
		signature: "OnGameEvent_match_invites_updated(params: table) -> null"
	},
	OnGameEvent_medic_death: {
		signature: "OnGameEvent_medic_death(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID who died": true,
			"attacker: int — user ID who killed": true,
			"healing: int — amount healed in this life": true,
			"charged: bool — had a full ubercharge?": true
		}
	},
	OnGameEvent_medic_defended: {
		signature: "OnGameEvent_medic_defended(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true,
			"medic: int": true
		}
	},
	OnGameEvent_medigun_shield_blocked_damage: {
		signature: "OnGameEvent_medigun_shield_blocked_damage(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the player using the shield": true,
			"damage: float — damage that was blocked": true
		}
	},
	OnGameEvent_merasmus_escape_warning: {
		signature: "OnGameEvent_merasmus_escape_warning(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int": true,
			"time_remaining: int": true
		}
	},
	OnGameEvent_merasmus_escaped: {
		signature: "OnGameEvent_merasmus_escaped(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int": true
		}
	},
	OnGameEvent_merasmus_killed: {
		signature: "OnGameEvent_merasmus_killed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int": true
		}
	},
	OnGameEvent_merasmus_prop_found: {
		signature: "OnGameEvent_merasmus_prop_found(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — userid of the player that found the prop Merasmus was hiding in": true
		}
	},
	OnGameEvent_merasmus_stunned: {
		signature: "OnGameEvent_merasmus_stunned(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — userid of the stunning player": true
		}
	},
	OnGameEvent_merasmus_summoned: {
		signature: "OnGameEvent_merasmus_summoned(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int": true
		}
	},
	OnGameEvent_minigame_win: {
		signature: "OnGameEvent_minigame_win(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"team: int — which team won the minigame": true,
			"type: int — what type of minigame was won": true
		}
	},
	OnGameEvent_minigame_won: {
		signature: "OnGameEvent_minigame_won(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — userid of the winning player": true,
			"game: int — index of the game": true
		}
	},
	OnGameEvent_mvm_adv_wave_complete_no_gates: {
		signature: "OnGameEvent_mvm_adv_wave_complete_no_gates(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — wave index": true
		}
	},
	OnGameEvent_mvm_adv_wave_killed_stun_radio: {
		signature: "OnGameEvent_mvm_adv_wave_killed_stun_radio(params: table) -> null"
	},
	OnGameEvent_mvm_begin_wave: {
		signature: "OnGameEvent_mvm_begin_wave(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"wave_index: int": true,
			"max_waves: int": true,
			"advanced: int": true
		}
	},
	OnGameEvent_mvm_bomb_alarm_triggered: {
		signature: "OnGameEvent_mvm_bomb_alarm_triggered(params: table) -> null"
	},
	OnGameEvent_mvm_bomb_carrier_killed: {
		signature: "OnGameEvent_mvm_bomb_carrier_killed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"level: int — upgrade level of the carrier": true
		}
	},
	OnGameEvent_mvm_bomb_deploy_reset_by_player: {
		signature: "OnGameEvent_mvm_bomb_deploy_reset_by_player(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true
		}
	},
	OnGameEvent_mvm_bomb_reset_by_player: {
		signature: "OnGameEvent_mvm_bomb_reset_by_player(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true
		}
	},
	OnGameEvent_mvm_creditbonus_all: {
		signature: "OnGameEvent_mvm_creditbonus_all(params: table) -> null"
	},
	OnGameEvent_mvm_creditbonus_all_advanced: {
		signature: "OnGameEvent_mvm_creditbonus_all_advanced(params: table) -> null"
	},
	OnGameEvent_mvm_creditbonus_wave: {
		signature: "OnGameEvent_mvm_creditbonus_wave(params: table) -> null"
	},
	OnGameEvent_mvm_kill_robot_delivering_bomb: {
		signature: "OnGameEvent_mvm_kill_robot_delivering_bomb(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true
		}
	},
	OnGameEvent_mvm_mannhattan_pit: {
		signature: "OnGameEvent_mvm_mannhattan_pit(params: table) -> null"
	},
	OnGameEvent_mvm_medic_powerup_shared: {
		signature: "OnGameEvent_mvm_medic_powerup_shared(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true
		}
	},
	OnGameEvent_mvm_mission_complete: {
		signature: "OnGameEvent_mvm_mission_complete(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"mission: string": true
		}
	},
	OnGameEvent_mvm_mission_update: {
		signature: "OnGameEvent_mvm_mission_update(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"class: int": true,
			"count: int": true
		}
	},
	OnGameEvent_mvm_pickup_currency: {
		signature: "OnGameEvent_mvm_pickup_currency(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true,
			"currency: int": true
		}
	},
	OnGameEvent_mvm_quick_sentry_upgrade: {
		signature: "OnGameEvent_mvm_quick_sentry_upgrade(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true
		}
	},
	OnGameEvent_mvm_reset_stats: {
		signature: "OnGameEvent_mvm_reset_stats(params: table) -> null"
	},
	OnGameEvent_mvm_scout_marked_for_death: {
		signature: "OnGameEvent_mvm_scout_marked_for_death(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true
		}
	},
	OnGameEvent_mvm_sentrybuster_detonate: {
		signature: "OnGameEvent_mvm_sentrybuster_detonate(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the target player": true,
			"det_x: float — origin of the sentry buster": true,
			"det_y: float": true,
			"det_z: float": true
		}
	},
	OnGameEvent_mvm_sentrybuster_killed: {
		signature: "OnGameEvent_mvm_sentrybuster_killed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"sentry_buster: int — entindex": true
		}
	},
	OnGameEvent_mvm_sniper_headshot_currency: {
		signature: "OnGameEvent_mvm_sniper_headshot_currency(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the player": true,
			"currency: int — currency collected": true
		}
	},
	OnGameEvent_mvm_tank_destroyed_by_players: {
		signature: "OnGameEvent_mvm_tank_destroyed_by_players(params: table) -> null"
	},
	OnGameEvent_mvm_wave_complete: {
		signature: "OnGameEvent_mvm_wave_complete(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"advanced: bool — is this an advanced popfile": true
		}
	},
	OnGameEvent_mvm_wave_failed: {
		signature: "OnGameEvent_mvm_wave_failed(params: table) -> null"
	},
	OnGameEvent_nav_blocked: {
		signature: "OnGameEvent_nav_blocked(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"area: int": true,
			"blocked: bool": true
		}
	},
	OnGameEvent_npc_hurt: {
		signature: "OnGameEvent_npc_hurt(params: table) -> null",
		description: {
			"Fired when an Engineer building ([obj_sentrygun](https://developer.valvesoftware.com/wiki/obj_sentrygun), [obj_dispenser](https://developer.valvesoftware.com/wiki/obj_dispenser), [obj_teleporter](https://developer.valvesoftware.com/wiki/obj_teleporter)), [base_boss](https://developer.valvesoftware.com/wiki/base_boss), MvM tank ([tank_boss](https://developer.valvesoftware.com/wiki/tank_boss)) or Halloween enemy ([headless_hatman](https://developer.valvesoftware.com/wiki/headless_hatman), [eyeball_boss](https://developer.valvesoftware.com/wiki/eyeball_boss), [merasmus](https://developer.valvesoftware.com/wiki/merasmus), [tf_zombie](https://developer.valvesoftware.com/wiki/tf_zombie)) is damaged.": false,
			"\n\n---\nVariables of the `params` table:": false,
			"entindex: int": true,
			"health: int": true,
			"attacker_player: int": true,
			"weaponid: int": true,
			"damageamount: int": true,
			"crit: bool": true,
			"boss: int — 1=HHH 2=Monoculus 3=Merasmus": true
		}
	},
	OnGameEvent_num_cappers_changed: {
		signature: "OnGameEvent_num_cappers_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — index of the trigger": true,
			"count: int — number of cappers (-1 for blocked)": true
		}
	},
	OnGameEvent_object_deflected: {
		signature: "OnGameEvent_object_deflected(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — player who deflected the object": true,
			"ownerid: int — owner of the object": true,
			"weaponid: int — weapon id (0 means the player in ownerid was pushed)": true,
			"object_entindex: int — entindex of the object that got deflected": true
		}
	},
	OnGameEvent_object_destroyed: {
		signature: "OnGameEvent_object_destroyed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID who died": true,
			"attacker: int — user ID who killed": true,
			"assister: int — user ID of assister": true,
			"weapon: string — weapon name killer used": true,
			"weaponid: int — id of the weapon used": true,
			"objecttype: int — type of object destroyed": true,
			"index: int — index of the object destroyed": true,
			"was_building: bool — object was being built when it died": true,
			"team: int — building's team": true
		}
	},
	OnGameEvent_object_detonated: {
		signature: "OnGameEvent_object_detonated(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the object owner": true,
			"objecttype: int — type of object removed": true,
			"index: int — index of the object removed": true
		}
	},
	OnGameEvent_object_removed: {
		signature: "OnGameEvent_object_removed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the object owner": true,
			"objecttype: int — type of object removed": true,
			"index: int — index of the object removed": true
		}
	},
	OnGameEvent_overtime_nag: {
		signature: "OnGameEvent_overtime_nag(params: table) -> null"
	},
	OnGameEvent_parachute_deploy: {
		signature: "OnGameEvent_parachute_deploy(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — entindex of the player": true
		}
	},
	OnGameEvent_parachute_holster: {
		signature: "OnGameEvent_parachute_holster(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — entindex of the player": true
		}
	},
	OnGameEvent_party_chat: {
		signature: "OnGameEvent_party_chat(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"steamid: string — steamID (64-bit value converted to string) of user who said or did the thing.  May be": true,
			"text: string — The message.  May have different meaning for some types": true,
			"type: int — What sort of message?  ETFPartyChatType enum": true
		}
	},
	OnGameEvent_party_criteria_changed: {
		signature: "OnGameEvent_party_criteria_changed(params: table) -> null"
	},
	OnGameEvent_party_invites_changed: {
		signature: "OnGameEvent_party_invites_changed(params: table) -> null"
	},
	OnGameEvent_party_member_join: {
		signature: "OnGameEvent_party_member_join(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"steamid: string — steamID (64-bit value converted to string) of joined": true
		}
	},
	OnGameEvent_party_member_leave: {
		signature: "OnGameEvent_party_member_leave(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"steamid: string — steamID (64-bit value converted to string) of leaver": true
		}
	},
	OnGameEvent_party_pref_changed: {
		signature: "OnGameEvent_party_pref_changed(params: table) -> null"
	},
	OnGameEvent_party_queue_state_changed: {
		signature: "OnGameEvent_party_queue_state_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"matchgroup: int — ETFMatchGroup": true
		}
	},
	OnGameEvent_party_updated: {
		signature: "OnGameEvent_party_updated(params: table) -> null"
	},
	OnGameEvent_pass_ball_blocked: {
		signature: "OnGameEvent_pass_ball_blocked(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"owner: int": true,
			"blocker: int": true
		}
	},
	OnGameEvent_pass_ball_stolen: {
		signature: "OnGameEvent_pass_ball_stolen(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"victim: int": true,
			"attacker: int": true
		}
	},
	OnGameEvent_pass_free: {
		signature: "OnGameEvent_pass_free(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"owner: int": true,
			"attacker: int": true
		}
	},
	OnGameEvent_pass_get: {
		signature: "OnGameEvent_pass_get(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"owner: int": true,
			"team: int": true
		}
	},
	OnGameEvent_pass_pass_caught: {
		signature: "OnGameEvent_pass_pass_caught(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"passer: int": true,
			"catcher: int": true,
			"dist: float": true,
			"duration: float": true
		}
	},
	OnGameEvent_pass_score: {
		signature: "OnGameEvent_pass_score(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"scorer: int": true,
			"assister: int": true,
			"points: int": true
		}
	},
	OnGameEvent_path_track_passed: {
		signature: "OnGameEvent_path_track_passed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int": true,
			"[entity handle](https://developer.valvesoftware.com/wiki/CHandle) of the node being passed(not the index!)": false
		}
	},
	OnGameEvent_payload_pushed: {
		signature: "OnGameEvent_payload_pushed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"pusher: int — userid of the player who pushed": true,
			"distance: int — how far they pushed": true
		}
	},
	OnGameEvent_physgun_pickup: {
		signature: "OnGameEvent_physgun_pickup(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int — entity picked up": true
		}
	},
	OnGameEvent_player_abandoned_match: {
		signature: "OnGameEvent_player_abandoned_match(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"game_over: bool": true
		}
	},
	OnGameEvent_player_account_changed: {
		signature: "OnGameEvent_player_account_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"old_value: int": true,
			"new_value: int": true
		}
	},
	OnGameEvent_player_activate: {
		signature: "OnGameEvent_player_activate(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID on server": true
		}
	},
	OnGameEvent_player_askedforball: {
		signature: "OnGameEvent_player_askedforball(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true
		}
	},
	OnGameEvent_player_bonuspoints: {
		signature: "OnGameEvent_player_bonuspoints(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"points: int": true,
			"player_entindex: int": true,
			"source_entindex: int": true
		}
	},
	OnGameEvent_player_buff: {
		signature: "OnGameEvent_player_buff(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the player the buff is being applied to": true,
			"buff_owner: int — user ID of the player with the banner": true,
			"buff_type: int — type of buff": true
		}
	},
	OnGameEvent_player_builtobject: {
		signature: "OnGameEvent_player_builtobject(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the builder": true,
			"object: int — type of object built": true,
			"index: int — index of the object": true
		}
	},
	OnGameEvent_player_buyback: {
		signature: "OnGameEvent_player_buyback(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true,
			"cost: int": true
		}
	},
	OnGameEvent_player_calledformedic: {
		signature: "OnGameEvent_player_calledformedic(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true
		}
	},
	OnGameEvent_player_carryobject: {
		signature: "OnGameEvent_player_carryobject(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the builder": true,
			"object: int — type of object built": true,
			"index: int — index of the object": true
		}
	},
	OnGameEvent_player_changeclass: {
		signature: "OnGameEvent_player_changeclass(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID who changed class": true,
			"class: int — class that they changed to": true
		}
	},
	OnGameEvent_player_changename: {
		signature: "OnGameEvent_player_changename(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID on server": true,
			"oldname: string — players old (current) name": true,
			"newname: string — players new name": true
		}
	},
	OnGameEvent_player_chargedeployed: {
		signature: "OnGameEvent_player_chargedeployed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of medic who deployed charge": true,
			"targetid: int — user ID of who the medic charged": true
		}
	},
	OnGameEvent_player_chat: {
		signature: "OnGameEvent_player_chat(params: table) -> null",
		description: {
			"a public player chat": false,
			"\n\n---\nVariables of the `params` table:": false,
			"teamonly: bool — true if team only chat": true,
			"userid: int — chatting player": true,
			"text: string — chat text": true
		}
	},
	OnGameEvent_player_class: {
		signature: "OnGameEvent_player_class(params: table) -> null",
		description: {
			"a player changed his class": false,
			"\n\n---\nVariables of the `params` table:": false,
			"userid: int — user ID on server": true,
			"class: string — new player class / model": true
		}
	},
	OnGameEvent_player_connect: {
		signature: "OnGameEvent_player_connect(params: table) -> null",
		description: {
			"A new client has connected. This does NOT fire between level changes as the player is already connected. Use `player_spawn` instead if you need to catch every player entity that is created.": false,
			"\n\n---\nVariables of the `params` table:": false,
			"name: string — player name": true,
			"index: int — player slot (entity index-1)": true,
			"userid: int — user ID on server (unique on server)": true,
			"networkid: string — player network (i.e steam) id": true,
			"address: string — ip:port": true,
			"bot: int — is a bot": true
		}
	},
	OnGameEvent_player_connect_client: {
		signature: "OnGameEvent_player_connect_client(params: table) -> null",
		description: {
			"a new client connected": false,
			"\n\n---\nVariables of the `params` table:": false,
			"name: string — player name": true,
			"index: int — player slot (entity index-1)": true,
			"userid: int — user ID on server (unique on server)": true,
			"networkid: string — player network (i.e steam) id": true,
			"bot: int — is a bot": true
		}
	},
	OnGameEvent_player_currency_changed: {
		signature: "OnGameEvent_player_currency_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"currency: int": true
		}
	},
	OnGameEvent_player_damage_dodged: {
		signature: "OnGameEvent_player_damage_dodged(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"damage: int": true
		}
	},
	OnGameEvent_player_damaged: {
		signature: "OnGameEvent_player_damaged(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"amount: int": true,
			"type: int": true
		}
	},
	OnGameEvent_player_death: {
		signature: "OnGameEvent_player_death(params: table) -> null",
		description: {
			"Fired when a player dies. This shows up in the kill feed.": false,
			"\n\n---\nVariables of the `params` table:": false,
			"userid: int — user ID who died": true,
			"victim_entindex: int": true,
			"inflictor_entindex: int — ent index of inflictor (a sentry, for example)": true,
			"attacker: int — user ID who killed": true,
			"weapon: string — weapon name killer used": true,
			"weaponid: int — ID of weapon killer used": true,
			"damagebits: int — bits of type of damage": true,
			"customkill: int — type of custom kill": true,
			"assister: int — user ID of assister": true,
			"weapon_logclassname: string — weapon name that should be printed on the log": true,
			"stun_flags: int — victim's stun flags at the moment of death": true,
			"death_flags: int": true,
			"See [death flags](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TF_DEATH).": false,
			"silent_kill: bool": true,
			"playerpenetratecount: int": true,
			"assister_fallback: string — contains a string to use if \"assister\" is -1": true,
			"kill_streak_total: int — Kill streak count (level)": true,
			"kill_streak_wep: int — Kill streak for killing weapon": true,
			"kill_streak_assist: int — Kill streak for assister count": true,
			"kill_streak_victim: int — Victims kill streak": true,
			"ducks_streaked: int — Duck streak increment from this kill": true,
			"duck_streak_total: int — Duck streak count for attacker": true,
			"duck_streak_assist: int — Duck streak count for assister": true,
			"duck_streak_victim: int — (former) duck streak count for victim": true,
			"rocket_jump: bool — was the victim rocket jumping": true,
			"weapon_def_index: int — item def index of weapon killer used": true,
			"crit_type: int — Crit type of kill.  0: None 1: Mini 2: Full": true,
			"dominated: int — did killer dominate victim with this kill": true,
			"assister_dominated: int — did assister dominate victim with this kill": true,
			"revenge: int — did killer get revenge on victim with this kill": true,
			"assister_revenge: int — did assister get revenge on victim with this kill": true,
			"first_blood: bool — was this a first blood kill": true,
			"feign_death: bool — the victim is feign death": true
		}
	},
	OnGameEvent_player_destroyed_pipebomb: {
		signature: "OnGameEvent_player_destroyed_pipebomb(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true
		}
	},
	OnGameEvent_player_directhit_stun: {
		signature: "OnGameEvent_player_directhit_stun(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"attacker: int — entindex of the attacker": true,
			"victim: int — entindex of the victim": true
		}
	},
	OnGameEvent_player_disconnect: {
		signature: "OnGameEvent_player_disconnect(params: table) -> null",
		description: {
			"A client has disconnected. The player handle and script scope still exists when this event fires, as it persists for a frame after disconnect.": false,
			"\n\n---\nVariables of the `params` table:": false,
			"userid: int — user ID on server": true,
			"reason: string — \"self\", \"kick\", \"ban\", \"cheat\", \"error\"": true,
			"name: string — player name": true,
			"networkid: string — player network (i.e steam) id": true,
			"bot: int — is a bot": true
		}
	},
	OnGameEvent_player_domination: {
		signature: "OnGameEvent_player_domination(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"dominator: int — userID of who gained domination": true,
			"dominated: int — userID of who got dominated": true,
			"dominations: int — Number of dominations this dominator has": true
		}
	},
	OnGameEvent_player_dropobject: {
		signature: "OnGameEvent_player_dropobject(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the builder": true,
			"object: int — type of object built": true,
			"index: int — index of the object": true
		}
	},
	OnGameEvent_player_escort_score: {
		signature: "OnGameEvent_player_escort_score(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true,
			"points: int": true
		}
	},
	OnGameEvent_player_extinguished: {
		signature: "OnGameEvent_player_extinguished(params: table) -> null",
		description: {
			"sent when a burning player is extinguished by a medic": false,
			"\n\n---\nVariables of the `params` table:": false,
			"victim: int — entindex of the player that was extinguished": true,
			"healer: int — entindex of the player who did the extinguishing": true,
			"itemdefindex: int — item defindex that did the extinguishing": true
		}
	},
	OnGameEvent_player_healed: {
		signature: "OnGameEvent_player_healed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"patient: int": true,
			"healer: int": true,
			"amount: int": true
		}
	},
	OnGameEvent_player_healedbymedic: {
		signature: "OnGameEvent_player_healedbymedic(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"medic: int": true
		}
	},
	OnGameEvent_player_healedmediccall: {
		signature: "OnGameEvent_player_healedmediccall(params: table) -> null",
		description: {
			"local player heals someone who called for medic.": false,
			"\n\n---\nVariables of the `params` table:": false,
			"userid: int — userid of person who got healed": true
		}
	},
	OnGameEvent_player_healonhit: {
		signature: "OnGameEvent_player_healonhit(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"amount: int": true,
			"entindex: int": true,
			"weapon_def_index: int — item def index of the healing weapon": true
		}
	},
	OnGameEvent_player_highfive_cancel: {
		signature: "OnGameEvent_player_highfive_cancel(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int": true
		}
	},
	OnGameEvent_player_highfive_start: {
		signature: "OnGameEvent_player_highfive_start(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int": true
		}
	},
	OnGameEvent_player_highfive_success: {
		signature: "OnGameEvent_player_highfive_success(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"initiator_entindex: int": true,
			"partner_entindex: int": true
		}
	},
	OnGameEvent_player_hintmessage: {
		signature: "OnGameEvent_player_hintmessage(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"hintmessage: string — localizable string of a hint": true
		}
	},
	OnGameEvent_player_hurt: {
		signature: "OnGameEvent_player_hurt(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true,
			"health: int — if <= 0, then this will play the killsound": true,
			"attacker: int": true,
			"damageamount: int": true,
			"custom: int": true,
			"showdisguisedcrit: bool — if our attribute specifically crits disguised enemies we need to show it on the client": true,
			"crit: bool — legacy only, use `bonuseffect`": true,
			"minicrit: bool — legacy only, use `bonuseffect`": true,
			"allseecrit: bool": true,
			"weaponid: int": true,
			"bonuseffect: int — type of damage effect": true,
			"See [constants page](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#kBonusEffect).": false
		}
	},
	OnGameEvent_player_ignited: {
		signature: "OnGameEvent_player_ignited(params: table) -> null",
		description: {
			"sent when a player is ignited, only to the two players involved": false,
			"\n\n---\nVariables of the `params` table:": false,
			"pyro_entindex: int — entindex of the pyro who ignited the victim": true,
			"victim_entindex: int — entindex of the player ignited by the pyro": true,
			"weaponid: int — weaponid of the weapon used": true
		}
	},
	OnGameEvent_player_ignited_inv: {
		signature: "OnGameEvent_player_ignited_inv(params: table) -> null",
		description: {
			"sent when a player is ignited by a pyro who is being invulned, only to the medic who's doing the invulning": false,
			"\n\n---\nVariables of the `params` table:": false,
			"pyro_entindex: int — entindex of the pyro who ignited the victim": true,
			"victim_entindex: int — entindex of the player ignited by the pyro": true,
			"medic_entindex: int — entindex of the medic releasing the invuln": true
		}
	},
	OnGameEvent_player_info: {
		signature: "OnGameEvent_player_info(params: table) -> null",
		description: {
			"a player changed his name": false,
			"\n\n---\nVariables of the `params` table:": false,
			"name: string — player name": true,
			"index: int — player slot (entity index-1)": true,
			"userid: int — user ID on server (unique on server)": true,
			"networkid: string — player network (i.e steam) id": true,
			"bot: bool — true if player is a AI bot": true
		}
	},
	OnGameEvent_player_initial_spawn: {
		signature: "OnGameEvent_player_initial_spawn(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int — entindex of the player": true
		}
	},
	OnGameEvent_player_invulned: {
		signature: "OnGameEvent_player_invulned(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true,
			"medic_userid: int": true
		}
	},
	OnGameEvent_player_jarated: {
		signature: "OnGameEvent_player_jarated(params: table) -> null",
		description: {
			"sent when a player is jarated, only to the two players involved": false,
			"\n\n---\nVariables of the `params` table:": false,
			"thrower_entindex: int — entindex of the player who threw the jarate": true,
			"victim_entindex: int — entindex of the player receiving it": true
		}
	},
	OnGameEvent_player_jarated_fade: {
		signature: "OnGameEvent_player_jarated_fade(params: table) -> null",
		description: {
			"sent when a player is jarated, only to the two players involved": false,
			"\n\n---\nVariables of the `params` table:": false,
			"thrower_entindex: int — entindex of the player who threw the jarate": true,
			"victim_entindex: int — entindex of the player receiving it": true
		}
	},
	OnGameEvent_player_killed_achievement_zone: {
		signature: "OnGameEvent_player_killed_achievement_zone(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"attacker: int — entindex of the attacker": true,
			"victim: int — entindex of the victim": true,
			"zone_id: int — type of area (0 for general, 1 for capture zone)": true
		}
	},
	OnGameEvent_player_mvp: {
		signature: "OnGameEvent_player_mvp(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true
		}
	},
	OnGameEvent_player_pinned: {
		signature: "OnGameEvent_player_pinned(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"pinned: int": true
		}
	},
	OnGameEvent_player_regenerate: {
		signature: "OnGameEvent_player_regenerate(params: table) -> null"
	},
	OnGameEvent_player_rocketpack_pushed: {
		signature: "OnGameEvent_player_rocketpack_pushed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"pusher: int — userID of who pushed": true,
			"pushed: int — userID of who got pushed": true
		}
	},
	OnGameEvent_player_sapped_object: {
		signature: "OnGameEvent_player_sapped_object(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the spy": true,
			"ownerid: int — user ID of the building owner": true,
			"object: int": true,
			"sapperid: int — index of the sapper": true
		}
	},
	OnGameEvent_player_say: {
		signature: "OnGameEvent_player_say(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID on server": true,
			"text: string — the say text": true
		}
	},
	OnGameEvent_player_score: {
		signature: "OnGameEvent_player_score(params: table) -> null",
		description: {
			"players scores changed": false,
			"\n\n---\nVariables of the `params` table:": false,
			"userid: int — user ID on server": true,
			"kills: int — # of kills": true,
			"deaths: int — # of deaths": true,
			"score: int — total game score": true
		}
	},
	OnGameEvent_player_score_changed: {
		signature: "OnGameEvent_player_score_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true,
			"delta: int": true
		}
	},
	OnGameEvent_player_shield_blocked: {
		signature: "OnGameEvent_player_shield_blocked(params: table) -> null",
		description: {
			"sent when a player is jarated, only to the two players involved": false,
			"\n\n---\nVariables of the `params` table:": false,
			"attacker_entindex: int — entindex of the player who threw the jarate": true,
			"blocker_entindex: int — entindex of the player receiving it": true
		}
	},
	OnGameEvent_player_shoot: {
		signature: "OnGameEvent_player_shoot(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID on server": true,
			"weapon: int — weapon ID": true,
			"mode: int — weapon mode": true
		}
	},
	OnGameEvent_player_spawn: {
		signature: "OnGameEvent_player_spawn(params: table) -> null",
		description: {
			"This event will be sent once when the player entity is created, i.e. they joined the server or they are loading in after a map change. In this case, `team` is equal to 0 (unassigned). Each time afterwards, the event will only be fired when the player spawns alive on red or blue team. This is also fired once when [SourceTV](https://developer.valvesoftware.com/wiki/SourceTV) is loaded in.": false,
			"\n\n---\nVariables of the `params` table:": false,
			"userid: int — user ID who spawned": true,
			"team: int — team they spawned on": true,
			"class: int — class they spawned as": true
		}
	},
	OnGameEvent_player_stats_updated: {
		signature: "OnGameEvent_player_stats_updated(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"forceupload: bool": true
		}
	},
	OnGameEvent_player_stealsandvich: {
		signature: "OnGameEvent_player_stealsandvich(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"owner: int": true,
			"target: int": true
		}
	},
	OnGameEvent_player_stunned: {
		signature: "OnGameEvent_player_stunned(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"stunner: int": true,
			"victim: int": true,
			"victim_capping: bool": true,
			"big_stun: bool": true
		}
	},
	OnGameEvent_player_team: {
		signature: "OnGameEvent_player_team(params: table) -> null",
		description: {
			"Fired when player joins a team.": false,
			"\n\n---\nVariables of the `params` table:": false,
			"userid: int — user ID on server": true,
			"team: int — team id": true,
			"oldteam: int — old team id": true,
			"disconnect: bool — team change because player disconnects": true,
			"autoteam: bool — true if the player was auto assigned to the team": true,
			"silent: bool — if true wont print the team join messages": true,
			"name: string — player's name": true
		}
	},
	OnGameEvent_player_teleported: {
		signature: "OnGameEvent_player_teleported(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — userid of the player": true,
			"builderid: int — userid of the player who built the teleporter": true,
			"dist: float — distance the player was teleported": true
		}
	},
	OnGameEvent_player_turned_to_ghost: {
		signature: "OnGameEvent_player_turned_to_ghost(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the player who changed to a ghost": true
		}
	},
	OnGameEvent_player_upgraded: {
		signature: "OnGameEvent_player_upgraded(params: table) -> null"
	},
	OnGameEvent_player_upgradedobject: {
		signature: "OnGameEvent_player_upgradedobject(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID of the builder": true,
			"object: int — type of object built": true,
			"index: int — index of the object": true,
			"isbuilder: bool": true
		}
	},
	OnGameEvent_player_use: {
		signature: "OnGameEvent_player_use(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID on server": true,
			"entity: int — entity used by player": true
		}
	},
	OnGameEvent_player_used_powerup_bottle: {
		signature: "OnGameEvent_player_used_powerup_bottle(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true,
			"type: int": true,
			"time: float": true
		}
	},
	OnGameEvent_playing_commentary: {
		signature: "OnGameEvent_playing_commentary(params: table) -> null"
	},
	OnGameEvent_post_inventory_application: {
		signature: "OnGameEvent_post_inventory_application(params: table) -> null",
		description: {
			"Fired when the player has items resupplied, i.e. when the player spawns or touches resupply ([func_regenerate](https://developer.valvesoftware.com/wiki/func_regenerate)).": false,
			"\n\n---\nVariables of the `params` table:": false,
			"userid: int": true
		}
	},
	OnGameEvent_projectile_direct_hit: {
		signature: "OnGameEvent_projectile_direct_hit(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"attacker: int — index of the player who shot the projectile": true,
			"victim: int — index of the player who got direct-ht": true,
			"weapon_def_index: int — defindex of the direct hitting weapon": true
		}
	},
	OnGameEvent_projectile_removed: {
		signature: "OnGameEvent_projectile_removed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"attacker: int": true,
			"weapon_def_index: int": true,
			"num_hit: int": true,
			"num_direct_hit: int": true
		}
	},
	OnGameEvent_pumpkin_lord_killed: {
		signature: "OnGameEvent_pumpkin_lord_killed(params: table) -> null"
	},
	OnGameEvent_pumpkin_lord_summoned: {
		signature: "OnGameEvent_pumpkin_lord_summoned(params: table) -> null"
	},
	OnGameEvent_pve_win_panel: {
		signature: "OnGameEvent_pve_win_panel(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"panel_style: int — for client to determine layout": true,
			"winning_team: int": true,
			"winreason: int — the reason the team won": true
		}
	},
	OnGameEvent_quest_map_data_changed: {
		signature: "OnGameEvent_quest_map_data_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"igniter: int — entindex of the igniter": true,
			"douser: int — entindex of the douser": true,
			"victim: int — entindex of the victim": true
		}
	},
	OnGameEvent_quest_objective_completed: {
		signature: "OnGameEvent_quest_objective_completed(params: table) -> null",
		description: {
			"For prediction": false,
			"\n\n---\nVariables of the `params` table:": false,
			"quest_item_id_low: int": true,
			"quest_item_id_hi: int": true,
			"quest_objective_id: int": true,
			"scorer_user_id: int": true
		}
	},
	OnGameEvent_quest_progress: {
		signature: "OnGameEvent_quest_progress(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"owner: int": true,
			"scorer: int": true,
			"type: int": true,
			"completed: bool": true,
			"quest_defindex: int": true
		}
	},
	OnGameEvent_quest_request: {
		signature: "OnGameEvent_quest_request(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"request: int": true,
			"msg: string — Protobuf serialized to a string": true
		}
	},
	OnGameEvent_quest_response: {
		signature: "OnGameEvent_quest_response(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"request: int": true,
			"success: bool": true,
			"msg: string — Protobuf serialized to a string": true
		}
	},
	OnGameEvent_quest_turn_in_state: {
		signature: "OnGameEvent_quest_turn_in_state(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"state: int — Maps to EQuestTurnInState": true
		}
	},
	OnGameEvent_questlog_opened: {
		signature: "OnGameEvent_questlog_opened(params: table) -> null"
	},
	OnGameEvent_ragdoll_dissolved: {
		signature: "OnGameEvent_ragdoll_dissolved(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int": true
		}
	},
	OnGameEvent_raid_spawn_mob: {
		signature: "OnGameEvent_raid_spawn_mob(params: table) -> null"
	},
	OnGameEvent_raid_spawn_squad: {
		signature: "OnGameEvent_raid_spawn_squad(params: table) -> null"
	},
	OnGameEvent_rd_player_score_points: {
		signature: "OnGameEvent_rd_player_score_points(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int": true,
			"method: int": true,
			"amount: int": true
		}
	},
	OnGameEvent_rd_robot_impact: {
		signature: "OnGameEvent_rd_robot_impact(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int": true,
			"impulse_x: float": true,
			"impulse_y: float": true,
			"impulse_z: float": true
		}
	},
	OnGameEvent_rd_robot_killed: {
		signature: "OnGameEvent_rd_robot_killed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID who died": true,
			"victim_entindex: int": true,
			"inflictor_entindex: int — ent index of inflictor (a sentry, for example)": true,
			"attacker: int — user ID who killed": true,
			"weapon: string — weapon name killer used": true,
			"weaponid: int — ID of weapon killed used": true,
			"damagebits: int — bits of type of damage": true,
			"customkill: int — type of custom kill": true,
			"weapon_logclassname: string — weapon name that should be printed on the log": true
		}
	},
	OnGameEvent_rd_rules_state_changed: {
		signature: "OnGameEvent_rd_rules_state_changed(params: table) -> null"
	},
	OnGameEvent_rd_team_points_changed: {
		signature: "OnGameEvent_rd_team_points_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"points: int": true,
			"team: int": true,
			"method: int": true
		}
	},
	OnGameEvent_recalculate_holidays: {
		signature: "OnGameEvent_recalculate_holidays(params: table) -> null"
	},
	OnGameEvent_recalculate_truce: {
		signature: "OnGameEvent_recalculate_truce(params: table) -> null"
	},
	OnGameEvent_rematch_failed_to_create: {
		signature: "OnGameEvent_rematch_failed_to_create(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"map_index: int — what they voted for": true,
			"vote: int — what the vote was": true
		}
	},
	OnGameEvent_remove_nemesis_relationships: {
		signature: "OnGameEvent_remove_nemesis_relationships(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player who should reset": true
		}
	},
	OnGameEvent_replay_endrecord: {
		signature: "OnGameEvent_replay_endrecord(params: table) -> null"
	},
	OnGameEvent_replay_replaysavailable: {
		signature: "OnGameEvent_replay_replaysavailable(params: table) -> null"
	},
	OnGameEvent_replay_saved: {
		signature: "OnGameEvent_replay_saved(params: table) -> null"
	},
	OnGameEvent_replay_servererror: {
		signature: "OnGameEvent_replay_servererror(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"error: string": true
		}
	},
	OnGameEvent_replay_sessioninfo: {
		signature: "OnGameEvent_replay_sessioninfo(params: table) -> null",
		description: {
			"Sent when the server begins recording, or when a client first connects - only sent once per recording session": false,
			"\n\n---\nVariables of the `params` table:": false,
			"sn: string — session name": true,
			"di: int — dump interval": true,
			"cb: int — current block": true,
			"st: int — session start tick": true
		}
	},
	OnGameEvent_replay_startrecord: {
		signature: "OnGameEvent_replay_startrecord(params: table) -> null",
		description: "Sent when the server begins recording - only used to display UI"
	},
	OnGameEvent_replay_youtube_stats: {
		signature: "OnGameEvent_replay_youtube_stats(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"views: int": true,
			"likes: int": true,
			"favorited: int": true
		}
	},
	OnGameEvent_respawn_ghost: {
		signature: "OnGameEvent_respawn_ghost(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"reviver: int — userid of the reviving player": true,
			"ghost: int — userid of the player that got revived": true
		}
	},
	OnGameEvent_restart_timer_time: {
		signature: "OnGameEvent_restart_timer_time(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"time: int — How much time is left": true
		}
	},
	OnGameEvent_revive_player_complete: {
		signature: "OnGameEvent_revive_player_complete(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int — entindex of the medic": true
		}
	},
	OnGameEvent_revive_player_notify: {
		signature: "OnGameEvent_revive_player_notify(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int": true,
			"marker_entindex: int": true
		}
	},
	OnGameEvent_revive_player_stopped: {
		signature: "OnGameEvent_revive_player_stopped(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"entindex: int": true
		}
	},
	OnGameEvent_rocket_jump: {
		signature: "OnGameEvent_rocket_jump(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true,
			"playsound: bool": true
		}
	},
	OnGameEvent_rocket_jump_landed: {
		signature: "OnGameEvent_rocket_jump_landed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true
		}
	},
	OnGameEvent_rocketpack_landed: {
		signature: "OnGameEvent_rocketpack_landed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true
		}
	},
	OnGameEvent_rocketpack_launch: {
		signature: "OnGameEvent_rocketpack_launch(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true,
			"playsound: bool": true
		}
	},
	OnGameEvent_round_end: {
		signature: "OnGameEvent_round_end(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"winner: int — winner team/user i": true,
			"reason: int — reson why team won": true,
			"message: string — end round message": true
		}
	},
	OnGameEvent_round_start: {
		signature: "OnGameEvent_round_start(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"timelimit: int — round time limit in seconds": true,
			"fraglimit: int — frag limit in seconds": true,
			"objective: string — round objective": true
		}
	},
	OnGameEvent_rps_taunt_event: {
		signature: "OnGameEvent_rps_taunt_event(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"winner: int — entindex of the winning player": true,
			"winner_rps: int — winner's selection": true,
			"loser: int — entindex of the losing player": true,
			"loser_rps: int — loser's selection": true
		}
	},
	OnGameEvent_schema_updated: {
		signature: "OnGameEvent_schema_updated(params: table) -> null"
	},
	OnGameEvent_scorestats_accumulated_reset: {
		signature: "OnGameEvent_scorestats_accumulated_reset(params: table) -> null",
		description: "Fired when round resets due to `mp_restartgame`."
	},
	OnGameEvent_scorestats_accumulated_update: {
		signature: "OnGameEvent_scorestats_accumulated_update(params: table) -> null",
		description: "Fired right before map entities are cleaned up for a round restart. \n\nThis event is not fired in Mann Vs Machine mode. For MvM, use `recalculate_holidays` and check if `GetRoundState() == 3` is true, which indicates a mission reset.\n\n"
	},
	OnGameEvent_scout_grand_slam: {
		signature: "OnGameEvent_scout_grand_slam(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"scout_id: int": true,
			"target_id: int": true
		}
	},
	OnGameEvent_scout_slamdoll_landed: {
		signature: "OnGameEvent_scout_slamdoll_landed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"target_index: int": true,
			"x: float": true,
			"y: float": true,
			"z: float": true
		}
	},
	OnGameEvent_sentry_on_go_active: {
		signature: "OnGameEvent_sentry_on_go_active(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int": true
		}
	},
	OnGameEvent_server_addban: {
		signature: "OnGameEvent_server_addban(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"name: string — player name": true,
			"userid: int — user ID on server": true,
			"networkid: string — player network (i.e steam) id": true,
			"ip: string — IP address": true,
			"duration: string — length of the ban": true,
			"by: string — banned by...": true,
			"kicked: bool — whether the player was also kicked": true
		}
	},
	OnGameEvent_server_changelevel_failed: {
		signature: "OnGameEvent_server_changelevel_failed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"levelname: string — The level name that failed changelevel": true
		}
	},
	OnGameEvent_server_cvar: {
		signature: "OnGameEvent_server_cvar(params: table) -> null",
		description: {
			"a server console var has changed": false,
			"\n\n---\nVariables of the `params` table:": false,
			"cvarname: string — cvar name, eg \"mp_roundtime\"": true,
			"cvarvalue: string — new cvar value": true
		}
	},
	OnGameEvent_server_message: {
		signature: "OnGameEvent_server_message(params: table) -> null",
		description: {
			"a generic server message": false,
			"\n\n---\nVariables of the `params` table:": false,
			"text: string — the message text": true
		}
	},
	OnGameEvent_server_removeban: {
		signature: "OnGameEvent_server_removeban(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"networkid: string — player network (i.e steam) id": true,
			"ip: string — IP address": true,
			"by: string — removed by...": true
		}
	},
	OnGameEvent_server_shutdown: {
		signature: "OnGameEvent_server_shutdown(params: table) -> null",
		description: {
			"server shut down": false,
			"\n\n---\nVariables of the `params` table:": false,
			"reason: string — reason why server was shut down": true
		}
	},
	OnGameEvent_server_spawn: {
		signature: "OnGameEvent_server_spawn(params: table) -> null",
		description: {
			"send once a server starts": false,
			"\n\n---\nVariables of the `params` table:": false,
			"hostname: string — public host name": true,
			"address: string — hostame, IP or DNS name": true,
			"ip: int": true,
			"port: int — server port": true,
			"game: string — game dir": true,
			"mapname: string — map name": true,
			"maxplayers: int — max players": true,
			"os: string — WIN32, LINUX": true,
			"dedicated: bool — true if dedicated server": true,
			"password: bool — true if password protected": true
		}
	},
	OnGameEvent_show_annotation: {
		signature: "OnGameEvent_show_annotation(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"worldPosX: float": true,
			"worldPosY: float": true,
			"worldPosZ: float": true,
			"worldNormalX: float": true,
			"worldNormalY: float": true,
			"worldNormalZ: float": true,
			"id: int": true,
			"text: string — name (unlocalized)": true,
			"lifetime: float": true,
			"visibilityBitfield: int — bitfield of the players that can see this. If 0, everyone can see it": true,
			"follow_entindex: int — if this is set, follow this entity": true,
			"show_distance: bool": true,
			"play_sound: string": true,
			"show_effect: bool": true
		}
	},
	OnGameEvent_show_class_layout: {
		signature: "OnGameEvent_show_class_layout(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"show: bool": true
		}
	},
	OnGameEvent_show_freezepanel: {
		signature: "OnGameEvent_show_freezepanel(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"killer: int — entindex of the killer entity": true
		}
	},
	OnGameEvent_show_match_summary: {
		signature: "OnGameEvent_show_match_summary(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"success: bool": true
		}
	},
	OnGameEvent_show_vs_panel: {
		signature: "OnGameEvent_show_vs_panel(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"show: bool": true
		}
	},
	OnGameEvent_single_player_death: {
		signature: "OnGameEvent_single_player_death(params: table) -> null"
	},
	OnGameEvent_skeleton_killed_quest: {
		signature: "OnGameEvent_skeleton_killed_quest(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — userid of the player that killed the skeleton": true
		}
	},
	OnGameEvent_skeleton_king_killed_quest: {
		signature: "OnGameEvent_skeleton_king_killed_quest(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — userid of the player that killed the skeleton": true
		}
	},
	OnGameEvent_slap_notice: {
		signature: "OnGameEvent_slap_notice(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID who died": true,
			"victim_entindex: int": true,
			"inflictor_entindex: int — ent index of inflictor (a sentry, for example)": true,
			"attacker: int — user ID who killed": true,
			"weapon: string — weapon name killer used": true,
			"weaponid: int — ID of weapon killed used": true,
			"damagebits: int — bits of type of damage": true,
			"customkill: int — type of custom kill": true,
			"assister: int — user ID of assister": true,
			"weapon_logclassname: string — weapon name that should be printed on the log": true,
			"stun_flags: int — victim's stun flags at the moment of death": true,
			"death_flags: int": true,
			"See [death flags](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TF_DEATH).": false,
			"silent_kill: bool": true,
			"assister_fallback: string — contains a string to use if \"assister\" is -1": true
		}
	},
	OnGameEvent_spec_target_updated: {
		signature: "OnGameEvent_spec_target_updated(params: table) -> null"
	},
	OnGameEvent_special_score: {
		signature: "OnGameEvent_special_score(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — index of the scorer": true
		}
	},
	OnGameEvent_spy_pda_reset: {
		signature: "OnGameEvent_spy_pda_reset(params: table) -> null"
	},
	OnGameEvent_stats_resetround: {
		signature: "OnGameEvent_stats_resetround(params: table) -> null"
	},
	OnGameEvent_sticky_jump: {
		signature: "OnGameEvent_sticky_jump(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true,
			"playsound: bool": true
		}
	},
	OnGameEvent_sticky_jump_landed: {
		signature: "OnGameEvent_sticky_jump_landed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int": true
		}
	},
	OnGameEvent_store_pricesheet_updated: {
		signature: "OnGameEvent_store_pricesheet_updated(params: table) -> null"
	},
	OnGameEvent_tagged_player_as_it: {
		signature: "OnGameEvent_tagged_player_as_it(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — userid of the tagging player": true
		}
	},
	OnGameEvent_take_armor: {
		signature: "OnGameEvent_take_armor(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"amount: int": true,
			"total: int": true
		}
	},
	OnGameEvent_take_health: {
		signature: "OnGameEvent_take_health(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"amount: int": true,
			"total: int": true
		}
	},
	OnGameEvent_team_info: {
		signature: "OnGameEvent_team_info(params: table) -> null",
		description: {
			"info about team": false,
			"\n\n---\nVariables of the `params` table:": false,
			"teamid: int — unique team id": true,
			"teamname: string — team name eg \"Team Blue\"": true
		}
	},
	OnGameEvent_team_leader_killed: {
		signature: "OnGameEvent_team_leader_killed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"killer: int — index of the killer": true,
			"victim: int — index of the victim": true
		}
	},
	OnGameEvent_team_score: {
		signature: "OnGameEvent_team_score(params: table) -> null",
		description: {
			"team score changed": false,
			"\n\n---\nVariables of the `params` table:": false,
			"teamid: int — team id": true,
			"score: int — total team score": true
		}
	},
	OnGameEvent_teamplay_alert: {
		signature: "OnGameEvent_teamplay_alert(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"alert_type: int — which alert type is this (scramble, etc)?": true
		}
	},
	OnGameEvent_teamplay_broadcast_audio: {
		signature: "OnGameEvent_teamplay_broadcast_audio(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"team: int — which team should hear the broadcast. 0 will make everyone hear it.": true,
			"sound: string — sound to play": true,
			"additional_flags: int — additional sound flags to pass through to sound system": true,
			"player: int — entindex of the player source or -1": true
		}
	},
	OnGameEvent_teamplay_capture_blocked: {
		signature: "OnGameEvent_teamplay_capture_blocked(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"cp: int — index of the point that was blocked": true,
			"cpname: string — name of the point": true,
			"blocker: int — index of the player that blocked the cap": true,
			"victim: int — index of the player that died, causing the block": true
		}
	},
	OnGameEvent_teamplay_capture_broken: {
		signature: "OnGameEvent_teamplay_capture_broken(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"cp: int": true,
			"cpname: string": true,
			"time_remaining: float": true
		}
	},
	OnGameEvent_teamplay_flag_event: {
		signature: "OnGameEvent_teamplay_flag_event(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — player this event involves": true,
			"carrier: int — the carrier if needed": true,
			"eventtype: int — pick up, capture, defend, dropped": true,
			"home: int — whether or not the flag was home (only set for TF_FLAGEVENT_PICKUP)": true,
			"team: int — which team the flag beints to": true
		}
	},
	OnGameEvent_teamplay_game_over: {
		signature: "OnGameEvent_teamplay_game_over(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"reason: string — why the game is over ( timelimit, winlimit )": true
		}
	},
	OnGameEvent_teamplay_map_time_remaining: {
		signature: "OnGameEvent_teamplay_map_time_remaining(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"seconds: int": true
		}
	},
	OnGameEvent_teamplay_overtime_begin: {
		signature: "OnGameEvent_teamplay_overtime_begin(params: table) -> null"
	},
	OnGameEvent_teamplay_overtime_end: {
		signature: "OnGameEvent_teamplay_overtime_end(params: table) -> null"
	},
	OnGameEvent_teamplay_point_captured: {
		signature: "OnGameEvent_teamplay_point_captured(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"cp: int — index of the point that was captured": true,
			"cpname: string — name of the point": true,
			"team: int — which team capped": true,
			"cappers: string — string where each character is a player index of someone that capped": true
		}
	},
	OnGameEvent_teamplay_point_locked: {
		signature: "OnGameEvent_teamplay_point_locked(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"cp: int — index of the point being captured": true,
			"cpname: string — name of the point": true,
			"team: int — which team currently owns the point": true
		}
	},
	OnGameEvent_teamplay_point_startcapture: {
		signature: "OnGameEvent_teamplay_point_startcapture(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"cp: int — index of the point being captured": true,
			"cpname: string — name of the point": true,
			"team: int — which team currently owns the point": true,
			"capteam: int — which team is capping": true,
			"cappers: string — string where each character is a player index of someone capping": true,
			"captime: float — time between when this cap started and when the point last changed hands": true
		}
	},
	OnGameEvent_teamplay_point_unlocked: {
		signature: "OnGameEvent_teamplay_point_unlocked(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"cp: int — index of the point being captured": true,
			"cpname: string — name of the point": true,
			"team: int — which team currently owns the point": true
		}
	},
	OnGameEvent_teamplay_pre_round_time_left: {
		signature: "OnGameEvent_teamplay_pre_round_time_left(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"time: int": true
		}
	},
	OnGameEvent_teamplay_ready_restart: {
		signature: "OnGameEvent_teamplay_ready_restart(params: table) -> null"
	},
	OnGameEvent_teamplay_restart_round: {
		signature: "OnGameEvent_teamplay_restart_round(params: table) -> null"
	},
	OnGameEvent_teamplay_round_active: {
		signature: "OnGameEvent_teamplay_round_active(params: table) -> null",
		description: "called when round is active, players can move"
	},
	OnGameEvent_teamplay_round_restart_seconds: {
		signature: "OnGameEvent_teamplay_round_restart_seconds(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"seconds: int": true
		}
	},
	OnGameEvent_teamplay_round_selected: {
		signature: "OnGameEvent_teamplay_round_selected(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"round: string — name of the round selected": true
		}
	},
	OnGameEvent_teamplay_round_stalemate: {
		signature: "OnGameEvent_teamplay_round_stalemate(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"reason: int — why the stalemate is occuring": true
		}
	},
	OnGameEvent_teamplay_round_start: {
		signature: "OnGameEvent_teamplay_round_start(params: table) -> null",
		description: {
			"round restart": false,
			"\n\n---\nVariables of the `params` table:": false,
			"full_reset: bool — is this a full reset of the map": true
		}
	},
	OnGameEvent_teamplay_round_win: {
		signature: "OnGameEvent_teamplay_round_win(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"team: int — which team won the round": true,
			"winreason: int — the reason the team won": true,
			"flagcaplimit: int — if win reason was flag cap limit, the value of the flag cap limit": true,
			"full_round: int — was this a full round or a mini-round": true,
			"round_time: float — elapsed time of this round": true,
			"losing_team_num_caps: int — # of caps this round by losing team": true,
			"was_sudden_death: int — did a team win this after entering sudden death": true
		}
	},
	OnGameEvent_teamplay_setup_finished: {
		signature: "OnGameEvent_teamplay_setup_finished(params: table) -> null"
	},
	OnGameEvent_teamplay_suddendeath_begin: {
		signature: "OnGameEvent_teamplay_suddendeath_begin(params: table) -> null"
	},
	OnGameEvent_teamplay_suddendeath_end: {
		signature: "OnGameEvent_teamplay_suddendeath_end(params: table) -> null"
	},
	OnGameEvent_teamplay_team_ready: {
		signature: "OnGameEvent_teamplay_team_ready(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"team: int — which team is ready": true
		}
	},
	OnGameEvent_teamplay_teambalanced_player: {
		signature: "OnGameEvent_teamplay_teambalanced_player(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"player: int — entindex of the player": true,
			"team: int — which team the player is being moved to": true
		}
	},
	OnGameEvent_teamplay_timer_flash: {
		signature: "OnGameEvent_teamplay_timer_flash(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"time_remaining: int — how many seconds until the round ends": true
		}
	},
	OnGameEvent_teamplay_timer_time_added: {
		signature: "OnGameEvent_teamplay_timer_time_added(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"timer: int — entindex of the timer": true,
			"seconds_added: int — how many seconds were added to the round timer": true
		}
	},
	OnGameEvent_teamplay_update_timer: {
		signature: "OnGameEvent_teamplay_update_timer(params: table) -> null"
	},
	OnGameEvent_teamplay_waiting_abouttoend: {
		signature: "OnGameEvent_teamplay_waiting_abouttoend(params: table) -> null"
	},
	OnGameEvent_teamplay_waiting_begins: {
		signature: "OnGameEvent_teamplay_waiting_begins(params: table) -> null"
	},
	OnGameEvent_teamplay_waiting_ends: {
		signature: "OnGameEvent_teamplay_waiting_ends(params: table) -> null"
	},
	OnGameEvent_teamplay_win_panel: {
		signature: "OnGameEvent_teamplay_win_panel(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"panel_style: int — for client to determine layout": true,
			"winning_team: int": true,
			"winreason: int — the reason the team won": true,
			"cappers: string — string where each character is a player index of someone that capped": true,
			"flagcaplimit: int — if win reason was flag cap limit, the value of the flag cap limit": true,
			"blue_score: int — red team score": true,
			"red_score: int — blue team score": true,
			"blue_score_prev: int — previous red team score": true,
			"red_score_prev: int — previous blue team score": true,
			"round_complete: int — is this a complete round, or the end of a mini-round": true,
			"rounds_remaining: int — # of rounds remaining for wining team, if mini-round": true,
			"player_1: int": true,
			"player_1_points: int": true,
			"player_2: int": true,
			"player_2_points: int": true,
			"player_3: int": true,
			"player_3_points: int": true,
			"killstreak_player_1: int": true,
			"killstreak_player_1_count: int": true,
			"game_over: int": true
		}
	},
	OnGameEvent_teams_changed: {
		signature: "OnGameEvent_teams_changed(params: table) -> null"
	},
	OnGameEvent_tf_game_over: {
		signature: "OnGameEvent_tf_game_over(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"reason: string — why the game is over ( timelimit, winlimit )": true
		}
	},
	OnGameEvent_tf_map_time_remaining: {
		signature: "OnGameEvent_tf_map_time_remaining(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"seconds: int": true
		}
	},
	OnGameEvent_throwable_hit: {
		signature: "OnGameEvent_throwable_hit(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID who died": true,
			"victim_entindex: int": true,
			"inflictor_entindex: int — ent index of inflictor (a sentry, for example)": true,
			"attacker: int — user ID who killed": true,
			"weapon: string — weapon name killer used": true,
			"weaponid: int — ID of weapon killed used": true,
			"damagebits: int — bits of type of damage": true,
			"customkill: int — type of custom kill": true,
			"assister: int — user ID of assister": true,
			"weapon_logclassname: string — weapon name that should be printed on the log": true,
			"stun_flags: int — victim's stun flags at the moment of death": true,
			"death_flags: int": true,
			"See [death flags](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#TF_DEATH).": false,
			"silent_kill: bool": true,
			"assister_fallback: string — contains a string to use if \"assister\" is -1": true,
			"totalhits: int — Number of hits his player has done": true
		}
	},
	OnGameEvent_tournament_enablecountdown: {
		signature: "OnGameEvent_tournament_enablecountdown(params: table) -> null"
	},
	OnGameEvent_tournament_stateupdate: {
		signature: "OnGameEvent_tournament_stateupdate(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"userid: int — user ID on server": true,
			"namechange: bool": true,
			"readystate: int": true,
			"newname: string — players new name": true
		}
	},
	OnGameEvent_training_complete: {
		signature: "OnGameEvent_training_complete(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"next_map: string — next map (if any)": true,
			"map: string — the name of the map this screen is on.": true,
			"text: string — text to show": true
		}
	},
	OnGameEvent_update_status_item: {
		signature: "OnGameEvent_update_status_item(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"index: int": true,
			"object: int": true
		}
	},
	OnGameEvent_upgrades_file_changed: {
		signature: "OnGameEvent_upgrades_file_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"path: string": true
		}
	},
	OnGameEvent_user_data_downloaded: {
		signature: "OnGameEvent_user_data_downloaded(params: table) -> null",
		description: "fired when achievements/stats are downloaded from Steam or XBox Live"
	},
	OnGameEvent_vote_cast: {
		signature: "OnGameEvent_vote_cast(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"vote_option: int — which option the player voted on": true,
			"team: int": true,
			"entityid: int — entity id of the voter": true,
			"voteidx: int": true
		}
	},
	OnGameEvent_vote_changed: {
		signature: "OnGameEvent_vote_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"vote_option1: int": true,
			"vote_option2: int": true,
			"vote_option3: int": true,
			"vote_option4: int": true,
			"vote_option5: int": true,
			"potentialVotes: int": true,
			"voteidx: int": true
		}
	},
	OnGameEvent_vote_ended: {
		signature: "OnGameEvent_vote_ended(params: table) -> null"
	},
	OnGameEvent_vote_failed: {
		signature: "OnGameEvent_vote_failed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"team: int": true,
			"voteidx: int": true
		}
	},
	OnGameEvent_vote_maps_changed: {
		signature: "OnGameEvent_vote_maps_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"type: int": true,
			"defindex: int": true,
			"created: bool": true,
			"deleted: bool": true,
			"erase_history: bool": true
		}
	},
	OnGameEvent_vote_options: {
		signature: "OnGameEvent_vote_options(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"count: int — Number of options — up to MAX_VOTE_OPTIONS": true,
			"option1: string": true,
			"option2: string": true,
			"option3: string": true,
			"option4: string": true,
			"option5: string": true,
			"voteidx: int": true
		}
	},
	OnGameEvent_vote_passed: {
		signature: "OnGameEvent_vote_passed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"details: string": true,
			"param1: string": true,
			"team: int": true,
			"voteidx: int": true
		}
	},
	OnGameEvent_vote_started: {
		signature: "OnGameEvent_vote_started(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"issue: string": true,
			"param1: string": true,
			"team: int": true,
			"initiator: int — entity id of the player who initiated the vote": true,
			"voteidx: int": true
		}
	},
	OnGameEvent_weapon_equipped: {
		signature: "OnGameEvent_weapon_equipped(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"class: string": true,
			"entindex: int": true
		}
	},
	OnGameEvent_winlimit_changed: {
		signature: "OnGameEvent_winlimit_changed(params: table) -> null",
		description: {
			"Variables of the `params` table:": false,
			"delay: float": true
		}
	},

}

export const allDeprecatedFunctions: Docs = {
	GetPhysAngularVelocity: {
		signature: "GetPhysAngularVelocity(entity: handle) -> Vector",
		description: "Returns the Angular velocity of the entity.  Deprecated, use the `GetPhysAngularVelocity` method on the entity instead."
	},
	GetPhysVelocity: {
		signature: "GetPhysVelocity(entity: handle) -> Vector",
		description: "Returns the velocity of the entity. Deprecated, use the `GetPhysVelocity` method on the entity instead."
	}

}

export const instancesMethods: InstancesDocs = {
	Convars: {
		GetBool: {
			signature: "Convars.GetBool(name: string) -> bool",
			description: "Returns the convar as a bool. May return null if no such convar."
		},
		GetClientConvarValue: {
			signature: "Convars.GetClientConvarValue(name: string, entindex: int) -> string",
			description: "Returns the convar value for the entindex as a string. Only works on client convars with the FCVAR_USERINFO flag."
		},
		GetInt: {
			signature: "Convars.GetInt(name: string) -> int",
			description: "Returns the convar as an int. May return null if no such convar."
		},
		GetStr: {
			signature: "Convars.GetStr(name: string) -> string",
			description: "Returns the convar as a string. May return null if no such convar. Returns `hunter2` if a protected convar is accessed."
		},
		GetFloat: {
			signature: "Convars.GetFloat(name: string) -> float",
			description: "Returns the convar as a float. May return null if no such convar."
		},
		IsConVarOnAllowList: {
			signature: "Convars.IsConVarOnAllowList(name: string) -> bool",
			description: "Checks if the convar is allowed to be used and is in cfg/vscript_convar_allowlist.txt. Please be nice with this and use it for *compatibility* if you need check support and NOT to force server owners to allow hostname to be set... or else this will simply lie and return true in future. ;-) You have been warned!"
		},
		SetValue: {
			signature: "Convars.SetValue(name: string, value: any) -> null",
			description: "Sets the value of the convar. The convar must be in cfg/vscript_convar_allowlist.txt to be set. Convars marked as cheat-only can be set even if *sv_cheats* is off. Convars marked as dev-only (i.e. not visible in console) can also be set. Supported types are bool, int, float, string. The original value of the convar is saved and is reset on map change, in other words convar changes will not persist across maps."
		}
	},
	Entities: {
		CreateByClassname: {
			signature: "CEntities.CreateByClassname(classname: string) -> handle",
			description: "Creates an entity by classname."
		},
		DispatchSpawn: {
			signature: "CEntities.DispatchSpawn(entity: handle) -> null",
			description: "Dispatches spawn of an entity! Use this on entities created via `CreateByClassname` to actually spawn them into the world."
		},
		FindByClassname: {
			signature: "CEntities.FindByClassname(previous: handle, classname: string) -> handle",
			description: "Find entities by the string of their `classname` keyvalue. Pass `null` value to start an iteration, or reference to a previously found entity to continue a search."
		},
		FindByClassnameNearest: {
			signature: "CEntities.FindByClassnameNearest(classname: string, center: Vector, radius: float) -> handle",
			description: "Find entities by classname nearest to a point within a radius."
		},
		FindByClassnameWithin: {
			signature: "CEntities.FindByClassnameWithin(previous: handle, classname: string, center: Vector, radius: float) -> handle",
			description: "Find entities by classname within a radius. Pass `null` to start an iteration, or reference to a previously found entity to continue a search."
		},
		FindByModel: {
			signature: "CEntities.FindByModel(previous: handle, model_name: string) -> handle",
			description: "Find entities by the string of their `model` keyvalue. Pass `null` to start an iteration, or reference to a previously found entity to continue a search."
		},
		FindByName: {
			signature: "CEntities.FindByName(previous: handle, targetname: string) -> handle",
			description: "Find entities by the string of their"
		},
		FindByNameNearest: {
			signature: "CEntities.FindByNameNearest(targetname: string, center: Vector, radius: float) -> handle",
			description: "Find entities by targetname nearest to a point within a radius."
		},
		FindByNameWithin: {
			signature: "CEntities.FindByNameWithin(previous: handle, targetname: string, center: Vector, radius: float) -> handle",
			description: "Find entities by targetname within a radius. Pass `null` to start an iteration, or reference to a previously found entity to continue a search."
		},
		FindByTarget: {
			signature: "CEntities.FindByTarget(previous: handle, target: string) -> handle",
			description: "Find entities by the string of their `target` keyvalue."
		},
		FindInSphere: {
			signature: "CEntities.FindInSphere(previous: handle, center: Vector, radius: float) -> handle",
			description: "Find entities within a radius. Pass `null` to start an iteration, or reference to a previously found entity to continue a search."
		},
		First: {
			signature: "CEntities.First() -> handle",
			description: "Begin an iteration over the list of entities. The first entity is always [worldspawn](https://developer.valvesoftware.com/wiki/worldspawn)."
		},
		Next: {
			signature: "CEntities.Next(previous: handle) -> handle",
			description: "At the given reference of a previously-found entity, returns the next one after it in the list."
		}
	},
	EntityOutputs: {
		AddOutput: {
			signature: "CScriptEntityOutputs.AddOutput(entity: handle, output_name: string, targetname: string, input_name: string, parameter: string, delay: float, times_to_fire: int) -> null",
			description: "Adds a new output to the entity."
		},
		GetNumElements: {
			signature: "CScriptEntityOutputs.GetNumElements(entity: handle, output_name: string) -> int",
			description: "Returns the number of array elements."
		},
		GetOutputTable: {
			signature: "CScriptEntityOutputs.GetOutputTable(entity: handle, output_name: string, table, array_element: int) -> null",
			description: "Fills the passed table with output information."
		},
		HasAction: {
			signature: "CScriptEntityOutputs.HasAction(entity: handle, output_name: string) -> bool",
			description: "Returns true if an action exists for the output."
		},
		HasOutput: {
			signature: "CScriptEntityOutputs.HasOutput(entity: handle, output_name: string) -> bool",
			description: "Returns true if the output exists."
		},
		RemoveOutput: {
			signature: "CScriptEntityOutputs.RemoveOutput(entity: handle, output_name: string, targetname: string, input_name: string, parameter: string) -> null",
			description: "Removes an output from the entity."
		}
	},

	NavMesh: {
		FindNavAreaAlongRay: {
			signature: "CNavMesh.FindNavAreaAlongRay(start_pos: Vector, end_pos: Vector, ignore_area: handle) -> handle",
			description: "Get nav area from ray."
		},
		GetAllAreas: {
			signature: "CNavMesh.GetAllAreas(result: table) -> null",
			description: "Fills a passed in table of all nav areas."
		},
		GetAreasWithAttributes: {
			signature: "CNavMesh.GetAreasWithAttributes(bits: FNavAttributeType, result: table) -> null",
			description: "Fills a passed in table of all nav areas that have the specified attributes.\n\nSee [FNavAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FNavAttributeType)."
		},
		GetNavArea: {
			signature: "CNavMesh.GetNavArea(origin: Vector, beneath: float) -> handle",
			description: "Given a position in the world, return the nav area that is closest to or below that height."
		},
		GetNavAreaByID: {
			signature: "CNavMesh.GetNavAreaByID(area_id: int) -> handle",
			description: "Get nav area by ID."
		},
		GetNavAreaCount: {
			signature: "CNavMesh.GetNavAreaCount() -> int",
			description: "Return total number of nav areas."
		},
		GetNavAreasFromBuildPath: {
			signature: "CNavMesh.GetNavAreasFromBuildPath(start_area: handle, end_area: handle, goal_pos: Vector, max_path_length: float, team: ETFTeam, ignore_nav_blockers: bool, result: table) -> bool",
			description: "Fills the table with areas from a path. Returns whether a path was found. If `end_area` is NULL, will compute a path as close as possible to `goal_pos`.\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
		},
		GetNavAreasInRadius: {
			signature: "CNavMesh.GetNavAreasInRadius(origin: Vector, radius: float, result: table) -> null",
			description: "Fills a passed in table of nav areas within radius."
		},
		GetNavAreasOverlappingEntityExtent: {
			signature: "CNavMesh.GetNavAreasOverlappingEntityExtent(entity: handle, result: table) -> null",
			description: "Fills passed in table with areas overlapping entity's extent."
		},
		GetNearestNavArea: {
			signature: "CNavMesh.GetNearestNavArea(origin: Vector, max_distance: float, check_los: bool, check_ground: bool) -> handle",
			description: "Given a position in the world, return the nav area that is closest to or below that height."
		},
		GetObstructingEntities: {
			signature: "CNavMesh.GetObstructingEntities(result: table) -> null",
			description: "Fills a passed in table of all obstructing entities."
		},
		NavAreaBuildPath: {
			signature: "CNavMesh.NavAreaBuildPath(start_area: handle, end_erea: handle, goal_pos: Vector, max_path_length: float, team: ETFTeam, ignore_nav_blockers: bool) -> bool",
			description: "Returns true if a path exists.\n\nSee [ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)."
		},
		NavAreaTravelDistance: {
			signature: "CNavMesh.NavAreaTravelDistance(start_area: handle, end_area: handle, max_path_length: float) -> float",
			description: "Compute distance between two areas. Return -1 if can't reach `end_area` from `start_area`."
		},
		RegisterAvoidanceObstacle: {
			signature: "CNavMesh.RegisterAvoidanceObstacle(entity: handle) -> null",
			description: "Registers avoidance obstacle."
		},
		UnregisterAvoidanceObstacle: {
			signature: "CNavMesh.UnregisterAvoidanceObstacle(entity: handle) -> null",
			description: "Unregisters avoidance obstacle."
		}
	},
	NetProps: {
		GetPropArraySize: {
			signature: "CNetPropManager.GetPropArraySize(entity: handle, property_name: string) -> int",
			description: "Returns the size of an netprop array, or -1."
		},
		GetPropEntity: {
			signature: "CNetPropManager.GetPropEntity(entity: handle, property_name: string) -> handle",
			description: "Reads an EHANDLE-valued netprop (21 bit integer). Returns the script handle of the entity."
		},
		GetPropEntityArray: {
			signature: "CNetPropManager.GetPropEntityArray(entity: handle, property_name: string, array_element: int) -> handle",
			description: "Reads an EHANDLE-valued netprop (21 bit integer) from an array. Returns the script handle of the entity."
		},
		GetPropBool: {
			signature: "CNetPropManager.GetPropBool(entity: handle, property_name: string) -> bool",
			description: "Reads a boolean-valued netprop."
		},
		GetPropBoolArray: {
			signature: "CNetPropManager.GetPropBoolArray(entity: handle, property_name: string, array_element: int) -> bool",
			description: "Reads a boolean-valued netprop from an array."
		},
		GetPropFloat: {
			signature: "CNetPropManager.GetPropFloat(entity: handle, property_name: string) -> float",
			description: "Reads a float-valued netprop."
		},
		GetPropFloatArray: {
			signature: "CNetPropManager.GetPropFloatArray(entity: handle, property_name: string, array_element: int) -> float",
			description: "Reads a float-valued netprop from an array."
		},
		GetPropInfo: {
			signature: "CNetPropManager.GetPropInfo(entity: handle, property_name: string, array_element: int, result: table) -> bool",
			description: "Fills in a passed table with property info for the provided entity."
		},
		GetPropInt: {
			signature: "CNetPropManager.GetPropInt(entity: handle, property_name: string) -> int",
			description: "Reads an integer-valued netprop."
		},
		GetPropIntArray: {
			signature: "CNetPropManager.GetPropIntArray(entity: handle, property_name: string, array_element: int) -> int",
			description: "Reads an integer-valued netprop from an array."
		},
		GetPropString: {
			signature: "CNetPropManager.GetPropString(entity: handle, property_name: string) -> string",
			description: "Reads an string-valued netprop."
		},
		GetPropStringArray: {
			signature: "CNetPropManager.GetPropStringArray(entity: handle, property_name: string, array_element: int) -> string",
			description: "Reads an string-valued netprop from an array."
		},
		GetPropType: {
			signature: "CNetPropManager.GetPropType(entity: handle, property_name: string) -> string",
			description: "Returns the name of the netprop type as a string."
		},
		GetPropVector: {
			signature: "CNetPropManager.GetPropVector(entity: handle, property_name: string) -> Vector",
			description: "Reads a 3D vector-valued netprop."
		},
		GetPropVectorArray: {
			signature: "CNetPropManager.GetPropVectorArray(entity: handle, property_name: string, array_element: int) -> Vector",
			description: "Reads a 3D vector-valued netprop from an array."
		},
		GetTable: {
			signature: "CNetPropManager.GetTable(entity: handle, prop_type: int, result: table) -> null",
			description: "Fills in a passed table with all props of a specified type for the provided entity (set prop_type to 0 for SendTable or 1 for DataMap)."
		},
		HasProp: {
			signature: "CNetPropManager.HasProp(entity: handle, property_name: string) -> bool",
			description: "Checks if a netprop exists."
		},
		SetPropBool: {
			signature: "CNetPropManager.SetPropBool(entity: handle, property_name: string, value: bool) -> null",
			description: "Sets a netprop to the specified boolean."
		},
		SetPropBoolArray: {
			signature: "CNetPropManager.SetPropBoolArray(entity: handle, property_name: string, value: bool, array_element: int) -> null",
			description: "Sets a netprop from an array to the specified boolean."
		},
		SetPropEntity: {
			signature: "CNetPropManager.SetPropEntity(entity: handle, property_name: string, value: handle) -> null",
			description: "Sets an EHANDLE-valued netprop (21 bit integer) to reference the specified entity."
		},
		SetPropEntityArray: {
			signature: "CNetPropManager.SetPropEntityArray(entity: handle, property_name: string, value: handle, array_element: int) -> null",
			description: "Sets an EHANDLE-valued netprop (21 bit integer) from an array to reference the specified entity."
		},
		SetPropFloat: {
			signature: "CNetPropManager.SetPropFloat(entity: handle, property_name: string, value: float) -> null",
			description: "Sets a netprop to the specified float."
		},
		SetPropFloatArray: {
			signature: "CNetPropManager.SetPropFloatArray(entity: handle, property_name: string, value: float, array_element: int) -> null",
			description: "Sets a netprop from an array to the specified float."
		},
		SetPropInt: {
			signature: "CNetPropManager.SetPropInt(entity: handle, property_name: string, value: int) -> null",
			description: "Sets a netprop to the specified integer."
		},
		SetPropIntArray: {
			signature: "CNetPropManager.SetPropIntArray(entity: handle, property_name: string, value: int, array_element: int) -> null",
			description: "Sets a netprop from an array to the specified integer."
		},
		SetPropString: {
			signature: "CNetPropManager.SetPropString(entity: handle, property_name: string, value: string) -> null",
			description: "Sets a netprop to the specified string."
		},
		SetPropStringArray: {
			signature: "CNetPropManager.SetPropStringArray(entity: handle, property_name: string, value: string, array_element: int) -> null",
			description: "Sets a netprop from an array to the specified string."
		},
		SetPropVector: {
			signature: "CNetPropManager.SetPropVector(entity: handle, property_name: string, value: Vector) -> null",
			description: "Sets a netprop to the specified vector."
		},
		SetPropVectorArray: {
			signature: "CNetPropManager.SetPropVectorArray(entity: handle, property_name: string, value: Vector, array_element: int) -> null",
			description: "Sets a netprop from an array to the specified vector."
		}
	},
	PlayerVoiceListener: {
		GetPlayerSpeechDuration: {
			signature: "CPlayerVoiceListener.GetPlayerSpeechDuration(player_index: int) -> float",
			description: "Returns the number of seconds the player has been continuously speaking."
		},
		IsPlayerSpeaking: {
			signature: "CPlayerVoiceListener.IsPlayerSpeaking(player_index: int) -> bool",
			description: "Returns whether the player specified is speaking."
		}
	}
}

export const builtInConstants: Docs = {
	_charsize_: {
		"signature": "_charsize_: int",
		"description": "Value: `1`"
	},
	_floatsize_: {
		"signature": "_floatsize_: int",
		"description": "Value: `4`"
	},
	_intsize_: {
		"signature": "_intsize_: int",
		"description": "Value:\n\n32-bit: `4`\n\n64-bit: `8`"
	},
	_version_: {
		"signature": "_version_: string",
		"description": "Value: \"Squirrel 3.2 stable\""
	},
	_versionnumber_: {
		"signature": "_versionnumber_: integer",
		"description": "Value: `320`"
	},
	RAND_MAX: {
		"signature": "RAND_MAX: integer",
		"description": "Value:\n\nWindows: `32768`\n\nLinux: `2147483647`"
	},
	PI: {
		"signature": "PI: float",
		"description": "Value: `3.14159`"
	}

}

export const builtInVariables: Docs = {
	
	Convars: {
		"signature": "Convars: Convars",
		"description": "Provides an interface to read and change the values of console variables."
	},
	Entities: {
		"signature": "Entities: CEntities",
		"description": "Provides access to currently spawned entities."
	},
	EntityOutputs: {
		"signature": "EntityOutputs: CScriptEntityOutputs",
		"description": "Provides access to currently spawned entities."
	},
	NavMesh: {
		"signature": "NavMesh: CNavMesh",
		"description": "Provides access to the maps NavMesh and NavAreas."
	},
	NetProps: {
		"signature": "NetProps: CNetPropManager",
		"description": "Allows reading and updating the network properties of an entity."
	},
	PlayerVoiceListener: {
		"signature": "PlayerVoiceListener: CPlayerVoiceListener",
		"description": "Tracks if any player is using voice and for how long."
	},
	__FILE__: {
		"signature": "__FILE__: string",
		"description": "File name of the currently executing script."
	},
	__LINE__: {
		"signature": "__LINE__: int",
		"description": "Line number of the currently executing code."
	},
	Constants: {
		"signature": "Constants: table",
		"description": "Enumerations for various function arguments or netprops."
	},
	Documentation: {
		"signature": "Documentation: table",
		"description": "Contains the printed strings from the script_help command."
	},
	GameEventCallbacks: {
		"signature": "GameEventCallbacks: table",
		"description": "Table of registered game event callbacks."
	},
	print_indent: {
		"signature": "print_indent: int",
		"description": "Value: `0`\n\nSpaces to indent prints by, except ones from realPrint."
	},
	_PublishedHelp: {
		"signature": "_PublishedHelp: table",
		"description": "NONE"
	},



	ScriptEventCallbacks: {
		"signature": "ScriptEventCallbacks: table",
		"description": "Table of registered script event callbacks."
	},
	ScriptHookCallbacks: {
		"signature": "ScriptHookCallbacks: table",
		"description": "Table of registered script hook callbacks."
	},
	ScriptDebugDefaultWatchColor: {
		"signature": "ScriptDebugDefaultWatchColor: array",
		"description": "Value: [0, 192, 0]."
	},
	ScriptDebugDrawTextEnabled: {
		"signature": "ScriptDebugDrawTextEnabled: bool",
		"description": "Value: `true`"
	},
	criptDebugDrawWatchesEnabled: {
		"signature": "ScriptDebugDrawWatchesEnabled: bool",
		"description": "Value: `true`"
	},
	ScriptDebugInDebugDraw: {
		"signature": "ScriptDebugInDebugDraw: bool",
		"description": "Value: `false`"
	},
	ScriptDebugText: {
		"signature": "ScriptDebugText: array",
		"description": "Value: `NONE`"
	},
	ScriptDebugTextIndent: {
		"signature": "ScriptDebugTextIndent: integer",
		"description": "Value: `0`"
	},
	ScriptDebugTextFilters: {
		"signature": "ScriptDebugTextFilters: table",
		"description": "Value: `NONE`"
	},
	ScriptDebugTraces: {
		"signature": "ScriptDebugTraces: table",
		"description": "Value: `NONE`"
	},
	ScriptDebugTraceAllOn: {
		"signature": "ScriptDebugTraceAllOn: bool",
		"description": "Value: `false`"
	},
	ScriptDebugWatches: {
		"signature": "ScriptDebugWatches: array",
		"description": "Value: `NONE`"
	},

	self: {
		"signature": "self: handle",
		"description": "Default scope variable which indicates what entity this scope belongs to."
	},
	__vname: {
		"signature": "__vname: string",
		"description": "Default scope variable with it's own script ID."
	},
	__vrefs: {
		"signature": "__vrefs: int"
	}
}

export const builtInEnums: Docs = {
	EBotType: {
		signature: "EBotType: enum"
	},
	ECollisionGroup: {
		signature: "ECollisionGroup: enum"
	},
	ECritType: {
		signature: "ECritType: enum"
	},
	EHitGroup: {
		signature: "EHitGroup: enum"
	},
	EHoliday: {
		signature: "EHoliday: enum"
	},
	EHudNotify: {
		signature: "EHudNotify: enum"
	},
	EMoveCollide: {
		signature: "EMoveCollide: enum"
	},
	EMoveType: {
		signature: "EMoveType: enum"
	},
	ENavCornerType: {
		signature: "ENavCornerType: enum"
	},
	ENavDirType: {
		signature: "ENavDirType: enum"
	},
	ENavRelativeDirType: {
		signature: "ENavRelativeDirType: enum"
	},
	ENavTraverseType: {
		signature: "ENavTraverseType: enum"
	},
	ERenderFx: {
		signature: "ERenderFx: enum"
	},
	ERenderMode: {
		signature: "ERenderMode: enum"
	},
	ERoundState: {
		signature: "ERoundState: enum"
	},
	EScriptRecipientFilter: {
		signature: "EScriptRecipientFilter: enum"
	},
	ESolidType: {
		signature: "ESolidType: enum"
	},
	ESpectatorMode: {
		signature: "ESpectatorMode: enum"
	},
	EStopwatchState: {
		signature: "EStopwatchState: enum"
	},
	ETFBotDifficultyType: {
		signature: "ETFBotDifficultyType: enum"
	},
	ETFClass: {
		signature: "ETFClass: enum"
	},
	ETFCond: {
		signature: "ETFCond: enum"
	},
	ETFDmgCustom: {
		signature: "ETFDmgCustom: enum"
	},
	ETFTeam: {
		signature: "ETFTeam: enum"
	},
	Math: {
		signature: "Math: enum"
	},
	Server: {
		signature: "Server: enum"
	},
	FButtons: {
		signature: "FButtons: enum"
	},
	FContents: {
		signature: "FContents: enum"
	},
	FDmgType: {
		signature: "FDmgType: enum"
	},
	FEntityEffects: {
		signature: "FEntityEffects: enum"
	},
	FEntityEFlags: {
		signature: "FEntityEFlags: enum"
	},
	FHideHUD: {
		signature: "FHideHUD: enum"
	},
	FNavAttributeType: {
		signature: "FNavAttributeType: enum"
	},
	FPlayer: {
		signature: "FPlayer: enum"
	},
	FSolid: {
		signature: "FSolid: enum"
	},
	FSurf: {
		signature: "FSurf: enum"
	},
	FTaunts: {
		signature: "FTaunts: enum"
	},
	FTFBotAttributeType: {
		signature: "FTFBotAttributeType: enum"
	},
	FTFNavAttributeType: {
		signature: "FTFNavAttributeType: enum"
	}
}

export const enumMembers: InstancesDocs = {
	EBotType: {
		TF_BOT_TYPE: {
			signature: "TF_BOT_TYPE: int",
			description: "Value: `1337`"
		}
	},
	ECollisionGroup: {
		COLLISION_GROUP_NONE: {
			signature: "COLLISION_GROUP_NONE: int",
			description: "Value: `0`"
		},
		COLLISION_GROUP_DEBRIS: {
			signature: "COLLISION_GROUP_DEBRIS: int",
			description: "Value: `1`"
		},
		COLLISION_GROUP_DEBRIS_TRIGGER: {
			signature: "COLLISION_GROUP_DEBRIS_TRIGGER: int",
			description: "Value: `2`"
		},
		COLLISION_GROUP_INTERACTIVE_DEBRIS: {
			signature: "COLLISION_GROUP_INTERACTIVE_DEBRIS: int",
			description: "Value: `3`"
		},
		COLLISION_GROUP_INTERACTIVE: {
			signature: "COLLISION_GROUP_INTERACTIVE: int",
			description: "Value: `4`"
		},
		COLLISION_GROUP_PLAYER: {
			signature: "COLLISION_GROUP_PLAYER: int",
			description: "Value: `5`"
		},
		COLLISION_GROUP_BREAKABLE_GLASS: {
			signature: "COLLISION_GROUP_BREAKABLE_GLASS: int",
			description: "Value: `6`"
		},
		COLLISION_GROUP_VEHICLE: {
			signature: "COLLISION_GROUP_VEHICLE: int",
			description: "Value: `7`"
		},
		COLLISION_GROUP_PLAYER_MOVEMENT: {
			signature: "COLLISION_GROUP_PLAYER_MOVEMENT: int",
			description: "Value: `8`"
		},
		COLLISION_GROUP_NPC: {
			signature: "COLLISION_GROUP_NPC: int",
			description: "Value: `9`"
		},
		COLLISION_GROUP_IN_VEHICLE: {
			signature: "COLLISION_GROUP_IN_VEHICLE: int",
			description: "Value: `10`"
		},
		COLLISION_GROUP_WEAPON: {
			signature: "COLLISION_GROUP_WEAPON: int",
			description: "Value: `11`"
		},
		COLLISION_GROUP_VEHICLE_CLIP: {
			signature: "COLLISION_GROUP_VEHICLE_CLIP: int",
			description: "Value: `12`"
		},
		COLLISION_GROUP_PROJECTILE: {
			signature: "COLLISION_GROUP_PROJECTILE: int",
			description: "Value: `13`"
		},
		COLLISION_GROUP_DOOR_BLOCKER: {
			signature: "COLLISION_GROUP_DOOR_BLOCKER: int",
			description: "Value: `14`"
		},
		COLLISION_GROUP_PASSABLE_DOOR: {
			signature: "COLLISION_GROUP_PASSABLE_DOOR: int",
			description: "Value: `15`"
		},
		COLLISION_GROUP_DISSOLVING: {
			signature: "COLLISION_GROUP_DISSOLVING: int",
			description: "Value: `16`"
		},
		COLLISION_GROUP_PUSHAWAY: {
			signature: "COLLISION_GROUP_PUSHAWAY: int",
			description: "Value: `17`"
		},
		COLLISION_GROUP_NPC_ACTOR: {
			signature: "COLLISION_GROUP_NPC_ACTOR: int",
			description: "Value: `18`"
		},
		COLLISION_GROUP_NPC_SCRIPTED: {
			signature: "COLLISION_GROUP_NPC_SCRIPTED: int",
			description: "Value: `19`"
		},
		LAST_SHARED_COLLISION_GROUP: {
			signature: "LAST_SHARED_COLLISION_GROUP: int",
			description: "Value: `20`"
		}
	},
	ECritType: {
		CRIT_NONE: {
			signature: "CRIT_NONE: int",
			description: "Value: `0`"
		},
		CRIT_MINI: {
			signature: "CRIT_MINI: int",
			description: "Value: `1`"
		},
		CRIT_FULL: {
			signature: "CRIT_FULL: int",
			description: "Value: `2`"
		}
	},
	EHitGroup: {
		HITGROUP_GENERIC: {
			signature: "HITGROUP_GENERIC: null",
			description: "Value: `null`\n\nBug: This is supposed to be 0"
		},
		HITGROUP_HEAD: {
			signature: "HITGROUP_HEAD: int",
			description: "Value: `1`"
		},
		HITGROUP_CHEST: {
			signature: "HITGROUP_CHEST: int",
			description: "Value: `2`"
		},
		HITGROUP_STOMACH: {
			signature: "HITGROUP_STOMACH: int",
			description: "Value: `3`"
		},
		HITGROUP_LEFTARM: {
			signature: "HITGROUP_LEFTARM: int",
			description: "Value: `4`"
		},
		HITGROUP_RIGHTARM: {
			signature: "HITGROUP_RIGHTARM: int",
			description: "Value: `5`"
		},
		HITGROUP_LEFTLEG: {
			signature: "HITGROUP_LEFTLEG: int",
			description: "Value: `6`"
		},
		HITGROUP_RIGHTLEG: {
			signature: "HITGROUP_RIGHTLEG: int",
			description: "Value: `7`"
		},
		HITGROUP_GEAR: {
			signature: "HITGROUP_GEAR: int",
			description: "Value: `10`"
		}
	},
	EHoliday: {
		kHoliday_None: {
			signature: "kHoliday_None: int",
			description: "Value: `0`"
		},
		kHoliday_TFBirthday: {
			signature: "kHoliday_TFBirthday: int",
			description: "Value: `1`"
		},
		kHoliday_Halloween: {
			signature: "kHoliday_Halloween: int",
			description: "Value: `2`"
		},
		kHoliday_Christmas: {
			signature: "kHoliday_Christmas: int",
			description: "Value: `3`"
		},
		kHoliday_CommunityUpdate: {
			signature: "kHoliday_CommunityUpdate: int",
			description: "Value: `4`"
		},
		kHoliday_EOTL: {
			signature: "kHoliday_EOTL: int",
			description: "Value: `5`"
		},
		kHoliday_Valentines: {
			signature: "kHoliday_Valentines: int",
			description: "Value: `6`"
		},
		kHoliday_MeetThePyro: {
			signature: "kHoliday_MeetThePyro: int",
			description: "Value: `7`"
		},
		kHoliday_FullMoon: {
			signature: "kHoliday_FullMoon: int",
			description: "Value: `8`"
		},
		kHoliday_HalloweenOrFullMoon: {
			signature: "kHoliday_HalloweenOrFullMoon: int",
			description: "Value: `9`"
		},
		kHoliday_HalloweenOrFullMoonOrValentines: {
			signature: "kHoliday_HalloweenOrFullMoonOrValentines: int",
			description: "Value: `10`"
		},
		kHoliday_AprilFools: {
			signature: "kHoliday_AprilFools: int",
			description: "Value: `11`"
		},
		kHoliday_Soldier: {
			signature: "kHoliday_Soldier: int",
			description: "Value: `12`"
		},
		kHoliday_Summer: {
			signature: "kHoliday_Summer: int",
			description: "Value: `13`"
		},
		kHolidayCount: {
			signature: "kHolidayCount: int",
			description: "Value: `14`"
		}
	},
	EHudNotify: {
		HUD_PRINTNOTIFY: {
			signature: "HUD_PRINTNOTIFY: int",
			description: "Value: `1`"
		},
		HUD_PRINTCONSOLE: {
			signature: "HUD_PRINTCONSOLE: int",
			description: "Value: `2`"
		},
		HUD_PRINTTALK: {
			signature: "HUD_PRINTTALK: int",
			description: "Value: `3`"
		},
		HUD_PRINTCENTER: {
			signature: "HUD_PRINTCENTER: int",
			description: "Value: `4`"
		}
	},
	EMoveCollide: {
		MOVECOLLIDE_DEFAULT: {
			signature: "MOVECOLLIDE_DEFAULT: int",
			description: "Value: `0`"
		},
		MOVECOLLIDE_FLY_BOUNCE: {
			signature: "MOVECOLLIDE_FLY_BOUNCE: int",
			description: "Value: `1`"
		},
		MOVECOLLIDE_FLY_CUSTOM: {
			signature: "MOVECOLLIDE_FLY_CUSTOM: int",
			description: "Value: `2`"
		},
		MOVECOLLIDE_FLY_SLIDE: {
			signature: "MOVECOLLIDE_FLY_SLIDE: int",
			description: "Value: `3`"
		},
		MOVECOLLIDE_MAX_BITS: {
			signature: "MOVECOLLIDE_MAX_BITS: int",
			description: "Value: `3`"
		},
		MOVECOLLIDE_COUNT: {
			signature: "MOVECOLLIDE_COUNT: int",
			description: "Value: `4`"
		}
	},
	EMoveType: {
		MOVETYPE_NONE: {
			signature: "MOVETYPE_NONE: int",
			description: "Value: `0`"
		},
		MOVETYPE_ISOMETRIC: {
			signature: "MOVETYPE_ISOMETRIC: int",
			description: "Value: `1`"
		},
		MOVETYPE_WALK: {
			signature: "MOVETYPE_WALK: int",
			description: "Value: `2`"
		},
		MOVETYPE_STEP: {
			signature: "MOVETYPE_STEP: int",
			description: "Value: `3`"
		},
		MOVETYPE_FLY: {
			signature: "MOVETYPE_FLY: int",
			description: "Value: `4`"
		},
		MOVETYPE_FLYGRAVITY: {
			signature: "MOVETYPE_FLYGRAVITY: int",
			description: "Value: `5`"
		},
		MOVETYPE_VPHYSICS: {
			signature: "MOVETYPE_VPHYSICS: int",
			description: "Value: `6`"
		},
		MOVETYPE_PUSH: {
			signature: "MOVETYPE_PUSH: int",
			description: "Value: `7`"
		},
		MOVETYPE_NOCLIP: {
			signature: "MOVETYPE_NOCLIP: int",
			description: "Value: `8`"
		},
		MOVETYPE_LADDER: {
			signature: "MOVETYPE_LADDER: int",
			description: "Value: `9`"
		},
		MOVETYPE_OBSERVER: {
			signature: "MOVETYPE_OBSERVER: int",
			description: "Value: `10`"
		},
		MOVETYPE_CUSTOM: {
			signature: "MOVETYPE_CUSTOM: int",
			description: "Value: `11`"
		},
		MOVETYPE_LAST: {
			signature: "MOVETYPE_LAST: int",
			description: "Value: `11`"
		}
	},
	ENavCornerType: {
		NORTH_WEST: {
			signature: "NORTH_WEST: int",
			description: "Value: `0`"
		},
		NORTH_EAST: {
			signature: "NORTH_EAST: int",
			description: "Value: `1`"
		},
		SOUTH_EAST: {
			signature: "SOUTH_EAST: int",
			description: "Value: `2`"
		},
		SOUTH_WEST: {
			signature: "SOUTH_WEST: int",
			description: "Value: `3`"
		},
		NUM_CORNERS: {
			signature: "NUM_CORNERS: int",
			description: "Value: `4`"
		}
	},
	ENavDirType: {
		NORTH: {
			signature: "NORTH: int",
			description: "Value: `0`"
		},
		EAST: {
			signature: "EAST: int",
			description: "Value: `1`"
		},
		SOUTH: {
			signature: "SOUTH: int",
			description: "Value: `2`"
		},
		WEST: {
			signature: "WEST: int",
			description: "Value: `3`"
		},
		NUM_DIRECTIONS: {
			signature: "NUM_DIRECTIONS: int",
			description: "Value: `4`"
		}
	},
	ENavRelativeDirType: {
		FORWARD: {
			signature: "FORWARD: int",
			description: "Value: `0`"
		},
		RIGHT: {
			signature: "RIGHT: int",
			description: "Value: `1`"
		},
		BACKWARD: {
			signature: "BACKWARD: int",
			description: "Value: `2`"
		},
		LEFT: {
			signature: "LEFT: int",
			description: "Value: `3`"
		},
		UP: {
			signature: "UP: int",
			description: "Value: `4`"
		},
		DOWN: {
			signature: "DOWN: int",
			description: "Value: `5`"
		},
		NUM_RELATIVE_DIRECTIONS: {
			signature: "NUM_RELATIVE_DIRECTIONS: int",
			description: "Value: `6`"
		}
	},
	ENavTraverseType: {
		GO_NORTH: {
			signature: "GO_NORTH: int",
			description: "Value: `0`"
		},
		GO_EAST: {
			signature: "GO_EAST: int",
			description: "Value: `1`"
		},
		GO_SOUTH: {
			signature: "GO_SOUTH: int",
			description: "Value: `2`"
		},
		GO_WEST: {
			signature: "GO_WEST: int",
			description: "Value: `3`"
		},
		GO_LADDER_UP: {
			signature: "GO_LADDER_UP: int",
			description: "Value: `4`"
		},
		GO_LADDER_DOWN: {
			signature: "GO_LADDER_DOWN: int",
			description: "Value: `5`"
		},
		GO_JUMP: {
			signature: "GO_JUMP: int",
			description: "Value: `6`"
		},
		GO_ELEVATOR_UP: {
			signature: "GO_ELEVATOR_UP: int",
			description: "Value: `7`"
		},
		GO_ELEVATOR_DOWN: {
			signature: "GO_ELEVATOR_DOWN: int",
			description: "Value: `8`"
		},
		NUM_TRAVERSE_TYPES: {
			signature: "NUM_TRAVERSE_TYPES: int",
			description: "Value: `9`"
		}
	},
	ERenderFx: {
		kRenderFxNone: {
			signature: "kRenderFxNone: int",
			description: "Value: `0`"
		},
		kRenderFxPulseSlow: {
			signature: "kRenderFxPulseSlow: int",
			description: "Value: `1`"
		},
		kRenderFxPulseFast: {
			signature: "kRenderFxPulseFast: int",
			description: "Value: `2`"
		},
		kRenderFxPulseSlowWide: {
			signature: "kRenderFxPulseSlowWide: int",
			description: "Value: `3`"
		},
		kRenderFxPulseFastWide: {
			signature: "kRenderFxPulseFastWide: int",
			description: "Value: `4`"
		},
		kRenderFxFadeSlow: {
			signature: "kRenderFxFadeSlow: int",
			description: "Value: `5`"
		},
		kRenderFxFadeFast: {
			signature: "kRenderFxFadeFast: int",
			description: "Value: `6`"
		},
		kRenderFxSolidSlow: {
			signature: "kRenderFxSolidSlow: int",
			description: "Value: `7`"
		},
		kRenderFxSolidFast: {
			signature: "kRenderFxSolidFast: int",
			description: "Value: `8`"
		},
		kRenderFxStrobeSlow: {
			signature: "kRenderFxStrobeSlow: int",
			description: "Value: `9`"
		},
		kRenderFxStrobeFast: {
			signature: "kRenderFxStrobeFast: int",
			description: "Value: `10`"
		},
		kRenderFxStrobeFaster: {
			signature: "kRenderFxStrobeFaster: int",
			description: "Value: `11`"
		},
		kRenderFxFlickerSlow: {
			signature: "kRenderFxFlickerSlow: int",
			description: "Value: `12`"
		},
		kRenderFxFlickerFast: {
			signature: "kRenderFxFlickerFast: int",
			description: "Value: `13`"
		},
		kRenderFxNoDissipation: {
			signature: "kRenderFxNoDissipation: int",
			description: "Value: `14`"
		},
		kRenderFxDistort: {
			signature: "kRenderFxDistort: int",
			description: "Value: `15`"
		},
		kRenderFxHologram: {
			signature: "kRenderFxHologram: int",
			description: "Value: `16`"
		},
		kRenderFxExplode: {
			signature: "kRenderFxExplode: int",
			description: "Value: `17`"
		},
		kRenderFxGlowShell: {
			signature: "kRenderFxGlowShell: int",
			description: "Value: `18`"
		},
		kRenderFxClampMinScale: {
			signature: "kRenderFxClampMinScale: int",
			description: "Value: `19`"
		},
		kRenderFxEnvRain: {
			signature: "kRenderFxEnvRain: int",
			description: "Value: `20`"
		},
		kRenderFxEnvSnow: {
			signature: "kRenderFxEnvSnow: int",
			description: "Value: `21`"
		},
		kRenderFxSpotlight: {
			signature: "kRenderFxSpotlight: int",
			description: "Value: `22`"
		},
		kRenderFxRagdoll: {
			signature: "kRenderFxRagdoll: int",
			description: "Value: `23`"
		},
		kRenderFxPulseFastWider: {
			signature: "kRenderFxPulseFastWider: int",
			description: "Value: `24`"
		},
		kRenderFxMax: {
			signature: "kRenderFxMax: int",
			description: "Value: `25`"
		}
	},
	ERenderMode: {
		kRenderNormal: {
			signature: "kRenderNormal: int",
			description: "Value: `0`"
		},
		kRenderTransColor: {
			signature: "kRenderTransColor: int",
			description: "Value: `1`"
		},
		kRenderTransTexture: {
			signature: "kRenderTransTexture: int",
			description: "Value: `2`"
		},
		kRenderGlow: {
			signature: "kRenderGlow: int",
			description: "Value: `3`"
		},
		kRenderTransAlpha: {
			signature: "kRenderTransAlpha: int",
			description: "Value: `4`"
		},
		kRenderTransAdd: {
			signature: "kRenderTransAdd: int",
			description: "Value: `5`"
		},
		kRenderEnvironmental: {
			signature: "kRenderEnvironmental: int",
			description: "Value: `6`"
		},
		kRenderTransAddFrameBlend: {
			signature: "kRenderTransAddFrameBlend: int",
			description: "Value: `7`"
		},
		kRenderTransAlphaAdd: {
			signature: "kRenderTransAlphaAdd: int",
			description: "Value: `8`"
		},
		kRenderWorldGlow: {
			signature: "kRenderWorldGlow: int",
			description: "Value: `9`"
		},
		kRenderNone: {
			signature: "kRenderNone: int",
			description: "Value: `10`"
		},
		kRenderModeCount: {
			signature: "kRenderModeCount: int",
			description: "Value: `11`"
		}
	},
	ERoundState: {
		GR_STATE_INIT: {
			signature: "GR_STATE_INIT: int",
			description: "Value: `0`"
		},
		GR_STATE_PREGAME: {
			signature: "GR_STATE_PREGAME: int",
			description: "Value: `1`"
		},
		GR_STATE_STARTGAME: {
			signature: "GR_STATE_STARTGAME: int",
			description: "Value: `2`"
		},
		GR_STATE_PREROUND: {
			signature: "GR_STATE_PREROUND: int",
			description: "Value: `3`"
		},
		GR_STATE_RND_RUNNING: {
			signature: "GR_STATE_RND_RUNNING: int",
			description: "Value: `4`"
		},
		GR_STATE_TEAM_WIN: {
			signature: "GR_STATE_TEAM_WIN: int",
			description: "Value: `5`"
		},
		GR_STATE_RESTART: {
			signature: "GR_STATE_RESTART: int",
			description: "Value: `6`"
		},
		GR_STATE_STALEMATE: {
			signature: "GR_STATE_STALEMATE: int",
			description: "Value: `7`"
		},
		GR_STATE_GAME_OVER: {
			signature: "GR_STATE_GAME_OVER: int",
			description: "Value: `8`"
		},
		GR_STATE_BONUS: {
			signature: "GR_STATE_BONUS: int",
			description: "Value: `9`"
		},
		GR_STATE_BETWEEN_RNDS: {
			signature: "GR_STATE_BETWEEN_RNDS: int",
			description: "Value: `10`"
		},
		GR_NUM_ROUND_STATES: {
			signature: "GR_NUM_ROUND_STATES: int",
			description: "Value: `11`"
		}
	},
	EScriptRecipientFilter: {
		RECIPIENT_FILTER_DEFAULT: {
			signature: "RECIPIENT_FILTER_DEFAULT: int",
			description: "Value: `0`"
		},
		RECIPIENT_FILTER_PAS_ATTENUATION: {
			signature: "RECIPIENT_FILTER_PAS_ATTENUATION: int",
			description: "Value: `1`"
		},
		RECIPIENT_FILTER_PAS: {
			signature: "RECIPIENT_FILTER_PAS: int",
			description: "Value: `2`"
		},
		RECIPIENT_FILTER_PVS: {
			signature: "RECIPIENT_FILTER_PVS: int",
			description: "Value: `3`"
		},
		RECIPIENT_FILTER_SINGLE_PLAYER: {
			signature: "RECIPIENT_FILTER_SINGLE_PLAYER: int",
			description: "Value: `4`"
		},
		RECIPIENT_FILTER_GLOBAL: {
			signature: "RECIPIENT_FILTER_GLOBAL: int",
			description: "Value: `5`"
		},
		RECIPIENT_FILTER_TEAM: {
			signature: "RECIPIENT_FILTER_TEAM: int",
			description: "Value: `6`"
		}
	},
	ESolidType: {
		SOLID_NONE: {
			signature: "SOLID_NONE: int",
			description: "Value: `0`"
		},
		SOLID_BSP: {
			signature: "SOLID_BSP: int",
			description: "Value: `1`"
		},
		SOLID_BBOX: {
			signature: "SOLID_BBOX: int",
			description: "Value: `2`"
		},
		SOLID_OBB: {
			signature: "SOLID_OBB: int",
			description: "Value: `3`"
		},
		SOLID_OBB_YAW: {
			signature: "SOLID_OBB_YAW: int",
			description: "Value: `4`"
		},
		SOLID_CUSTOM: {
			signature: "SOLID_CUSTOM: int",
			description: "Value: `5`"
		},
		SOLID_VPHYSICS: {
			signature: "SOLID_VPHYSICS: int",
			description: "Value: `6`"
		},
		SOLID_LAST: {
			signature: "SOLID_LAST: int",
			description: "Value: `7`"
		}
	},
	ESpectatorMode: {
		OBS_MODE_NONE: {
			signature: "OBS_MODE_NONE: int",
			description: "Value: `0`"
		},
		OBS_MODE_DEATHCAM: {
			signature: "OBS_MODE_DEATHCAM: int",
			description: "Value: `1`"
		},
		OBS_MODE_FREEZECAM: {
			signature: "OBS_MODE_FREEZECAM: int",
			description: "Value: `2`"
		},
		OBS_MODE_FIXED: {
			signature: "OBS_MODE_FIXED: int",
			description: "Value: `3`"
		},
		OBS_MODE_IN_EYE: {
			signature: "OBS_MODE_IN_EYE: int",
			description: "Value: `4`"
		},
		OBS_MODE_CHASE: {
			signature: "OBS_MODE_CHASE: int",
			description: "Value: `5`"
		},
		OBS_MODE_POI: {
			signature: "OBS_MODE_POI: int",
			description: "Value: `6`"
		},
		OBS_MODE_ROAMING: {
			signature: "OBS_MODE_ROAMING: int",
			description: "Value: `7`"
		},
		NUM_OBSERVER_MODES: {
			signature: "NUM_OBSERVER_MODES: int",
			description: "Value: `8`"
		}
	},
	EStopwatchState: {
		STOPWATCH_CAPTURE_TIME_NOT_SET: {
			signature: "STOPWATCH_CAPTURE_TIME_NOT_SET: int",
			description: "Value: `0`"
		},
		STOPWATCH_RUNNING: {
			signature: "STOPWATCH_RUNNING: int",
			description: "Value: `1`"
		},
		STOPWATCH_OVERTIME: {
			signature: "STOPWATCH_OVERTIME: int",
			description: "Value: `2`"
		}
	},
	ETFBotDifficultyType: {
		EASY: {
			signature: "EASY: int",
			description: "Value: `0`"
		},
		NORMAL: {
			signature: "NORMAL: int",
			description: "Value: `1`"
		},
		HARD: {
			signature: "HARD: int",
			description: "Value: `2`"
		},
		EXPERT: {
			signature: "EXPERT: int",
			description: "Value: `3`"
		},
		NUM_DIFFICULTY_LEVELS: {
			signature: "NUM_DIFFICULTY_LEVELS: int",
			description: "Value: `4`"
		},
		UNDEFINED: {
			signature: "UNDEFINED: int",
			description: "Value: `-1`"
		}
	},
	ETFClass: {
		TF_CLASS_UNDEFINED: {
			signature: "TF_CLASS_UNDEFINED: int",
			description: "Value: `0`"
		},
		TF_CLASS_SCOUT: {
			signature: "TF_CLASS_SCOUT: int",
			description: "Value: `1`"
		},
		TF_CLASS_SNIPER: {
			signature: "TF_CLASS_SNIPER: int",
			description: "Value: `2`"
		},
		TF_CLASS_SOLDIER: {
			signature: "TF_CLASS_SOLDIER: int",
			description: "Value: `3`"
		},
		TF_CLASS_DEMOMAN: {
			signature: "TF_CLASS_DEMOMAN: int",
			description: "Value: `4`"
		},
		TF_CLASS_MEDIC: {
			signature: "TF_CLASS_MEDIC: int",
			description: "Value: `5`"
		},
		TF_CLASS_HEAVYWEAPONS: {
			signature: "TF_CLASS_HEAVYWEAPONS: int",
			description: "Value: `6`"
		},
		TF_CLASS_PYRO: {
			signature: "TF_CLASS_PYRO: int",
			description: "Value: `7`"
		},
		TF_CLASS_SPY: {
			signature: "TF_CLASS_SPY: int",
			description: "Value: `8`"
		},
		TF_CLASS_ENGINEER: {
			signature: "TF_CLASS_ENGINEER: int",
			description: "Value: `9`"
		},
		TF_CLASS_CIVILIAN: {
			signature: "TF_CLASS_CIVILIAN: int",
			description: "Value: `10`"
		},
		TF_CLASS_COUNT_ALL: {
			signature: "TF_CLASS_COUNT_ALL: int",
			description: "Value: `11`"
		},
		TF_CLASS_RANDOM: {
			signature: "TF_CLASS_RANDOM: int",
			description: "Value: `12`"
		}
	},
	ETFCond: {
		TF_COND_AIMING: {
			signature: "TF_COND_AIMING: int",
			description: "Value: `0`"
		},
		TF_COND_ZOOMED: {
			signature: "TF_COND_ZOOMED: int",
			description: "Value: `1`"
		},
		TF_COND_DISGUISING: {
			signature: "TF_COND_DISGUISING: int",
			description: "Value: `2`"
		},
		TF_COND_DISGUISED: {
			signature: "TF_COND_DISGUISED: int",
			description: "Value: `3`"
		},
		TF_COND_STEALTHED: {
			signature: "TF_COND_STEALTHED: int",
			description: "Value: `4`"
		},
		TF_COND_INVULNERABLE: {
			signature: "TF_COND_INVULNERABLE: int",
			description: "Value: `5`"
		},
		TF_COND_TELEPORTED: {
			signature: "TF_COND_TELEPORTED: int",
			description: "Value: `6`"
		},
		TF_COND_TAUNTING: {
			signature: "TF_COND_TAUNTING: int",
			description: "Value: `7`"
		},
		TF_COND_INVULNERABLE_WEARINGOFF: {
			signature: "TF_COND_INVULNERABLE_WEARINGOFF: int",
			description: "Value: `8`"
		},
		TF_COND_STEALTHED_BLINK: {
			signature: "TF_COND_STEALTHED_BLINK: int",
			description: "Value: `9`"
		},
		TF_COND_SELECTED_TO_TELEPORT: {
			signature: "TF_COND_SELECTED_TO_TELEPORT: int",
			description: "Value: `10`"
		},
		TF_COND_CRITBOOSTED: {
			signature: "TF_COND_CRITBOOSTED: int",
			description: "Value: `11`"
		},
		TF_COND_TMPDAMAGEBONUS: {
			signature: "TF_COND_TMPDAMAGEBONUS: int",
			description: "Value: `12`"
		},
		TF_COND_FEIGN_DEATH: {
			signature: "TF_COND_FEIGN_DEATH: int",
			description: "Value: `13`"
		},
		TF_COND_PHASE: {
			signature: "TF_COND_PHASE: int",
			description: "Value: `14`"
		},
		TF_COND_STUNNED: {
			signature: "TF_COND_STUNNED: int",
			description: "Value: `15`"
		},
		TF_COND_OFFENSEBUFF: {
			signature: "TF_COND_OFFENSEBUFF: int",
			description: "Value: `16`"
		},
		TF_COND_SHIELD_CHARGE: {
			signature: "TF_COND_SHIELD_CHARGE: int",
			description: "Value: `17`"
		},
		TF_COND_DEMO_BUFF: {
			signature: "TF_COND_DEMO_BUFF: int",
			description: "Value: `18`"
		},
		TF_COND_ENERGY_BUFF: {
			signature: "TF_COND_ENERGY_BUFF: int",
			description: "Value: `19`"
		},
		TF_COND_RADIUSHEAL: {
			signature: "TF_COND_RADIUSHEAL: int",
			description: "Value: `20`"
		},
		TF_COND_HEALTH_BUFF: {
			signature: "TF_COND_HEALTH_BUFF: int",
			description: "Value: `21`"
		},
		TF_COND_BURNING: {
			signature: "TF_COND_BURNING: int",
			description: "Value: `22`"
		},
		TF_COND_HEALTH_OVERHEALED: {
			signature: "TF_COND_HEALTH_OVERHEALED: int",
			description: "Value: `23`"
		},
		TF_COND_URINE: {
			signature: "TF_COND_URINE: int",
			description: "Value: `24`"
		},
		TF_COND_BLEEDING: {
			signature: "TF_COND_BLEEDING: int",
			description: "Value: `25`"
		},
		TF_COND_DEFENSEBUFF: {
			signature: "TF_COND_DEFENSEBUFF: int",
			description: "Value: `26`"
		},
		TF_COND_MAD_MILK: {
			signature: "TF_COND_MAD_MILK: int",
			description: "Value: `27`"
		},
		TF_COND_MEGAHEAL: {
			signature: "TF_COND_MEGAHEAL: int",
			description: "Value: `28`"
		},
		TF_COND_REGENONDAMAGEBUFF: {
			signature: "TF_COND_REGENONDAMAGEBUFF: int",
			description: "Value: `29`"
		},
		TF_COND_MARKEDFORDEATH: {
			signature: "TF_COND_MARKEDFORDEATH: int",
			description: "Value: `30`"
		},
		TF_COND_NOHEALINGDAMAGEBUFF: {
			signature: "TF_COND_NOHEALINGDAMAGEBUFF: int",
			description: "Value: `31`"
		},
		TF_COND_SPEED_BOOST: {
			signature: "TF_COND_SPEED_BOOST: int",
			description: "Value: `32`"
		},
		TF_COND_CRITBOOSTED_PUMPKIN: {
			signature: "TF_COND_CRITBOOSTED_PUMPKIN: int",
			description: "Value: `33`"
		},
		TF_COND_CRITBOOSTED_USER_BUFF: {
			signature: "TF_COND_CRITBOOSTED_USER_BUFF: int",
			description: "Value: `34`"
		},
		TF_COND_CRITBOOSTED_DEMO_CHARGE: {
			signature: "TF_COND_CRITBOOSTED_DEMO_CHARGE: int",
			description: "Value: `35`"
		},
		TF_COND_SODAPOPPER_HYPE: {
			signature: "TF_COND_SODAPOPPER_HYPE: int",
			description: "Value: `36`"
		},
		TF_COND_CRITBOOSTED_FIRST_BLOOD: {
			signature: "TF_COND_CRITBOOSTED_FIRST_BLOOD: int",
			description: "Value: `37`"
		},
		TF_COND_CRITBOOSTED_BONUS_TIME: {
			signature: "TF_COND_CRITBOOSTED_BONUS_TIME: int",
			description: "Value: `38`"
		},
		TF_COND_CRITBOOSTED_CTF_CAPTURE: {
			signature: "TF_COND_CRITBOOSTED_CTF_CAPTURE: int",
			description: "Value: `39`"
		},
		TF_COND_CRITBOOSTED_ON_KILL: {
			signature: "TF_COND_CRITBOOSTED_ON_KILL: int",
			description: "Value: `40`"
		},
		TF_COND_CANNOT_SWITCH_FROM_MELEE: {
			signature: "TF_COND_CANNOT_SWITCH_FROM_MELEE: int",
			description: "Value: `41`"
		},
		TF_COND_DEFENSEBUFF_NO_CRIT_BLOCK: {
			signature: "TF_COND_DEFENSEBUFF_NO_CRIT_BLOCK: int",
			description: "Value: `42`"
		},
		TF_COND_REPROGRAMMED: {
			signature: "TF_COND_REPROGRAMMED: int",
			description: "Value: `43`"
		},
		TF_COND_CRITBOOSTED_RAGE_BUFF: {
			signature: "TF_COND_CRITBOOSTED_RAGE_BUFF: int",
			description: "Value: `44`"
		},
		TF_COND_DEFENSEBUFF_HIGH: {
			signature: "TF_COND_DEFENSEBUFF_HIGH: int",
			description: "Value: `45`"
		},
		TF_COND_SNIPERCHARGE_RAGE_BUFF: {
			signature: "TF_COND_SNIPERCHARGE_RAGE_BUFF: int",
			description: "Value: `46`"
		},
		TF_COND_DISGUISE_WEARINGOFF: {
			signature: "TF_COND_DISGUISE_WEARINGOFF: int",
			description: "Value: `47`"
		},
		TF_COND_MARKEDFORDEATH_SILENT: {
			signature: "TF_COND_MARKEDFORDEATH_SILENT: int",
			description: "Value: `48`"
		},
		TF_COND_DISGUISED_AS_DISPENSER: {
			signature: "TF_COND_DISGUISED_AS_DISPENSER: int",
			description: "Value: `49`"
		},
		TF_COND_SAPPED: {
			signature: "TF_COND_SAPPED: int",
			description: "Value: `50`"
		},
		TF_COND_INVULNERABLE_HIDE_UNLESS_DAMAGED: {
			signature: "TF_COND_INVULNERABLE_HIDE_UNLESS_DAMAGED: int",
			description: "Value: `51`"
		},
		TF_COND_INVULNERABLE_USER_BUFF: {
			signature: "TF_COND_INVULNERABLE_USER_BUFF: int",
			description: "Value: `52`"
		},
		TF_COND_HALLOWEEN_BOMB_HEAD: {
			signature: "TF_COND_HALLOWEEN_BOMB_HEAD: int",
			description: "Value: `53`"
		},
		TF_COND_HALLOWEEN_THRILLER: {
			signature: "TF_COND_HALLOWEEN_THRILLER: int",
			description: "Value: `54`"
		},
		TF_COND_RADIUSHEAL_ON_DAMAGE: {
			signature: "TF_COND_RADIUSHEAL_ON_DAMAGE: int",
			description: "Value: `55`"
		},
		TF_COND_CRITBOOSTED_CARD_EFFECT: {
			signature: "TF_COND_CRITBOOSTED_CARD_EFFECT: int",
			description: "Value: `56`"
		},
		TF_COND_INVULNERABLE_CARD_EFFECT: {
			signature: "TF_COND_INVULNERABLE_CARD_EFFECT: int",
			description: "Value: `57`"
		},
		TF_COND_MEDIGUN_UBER_BULLET_RESIST: {
			signature: "TF_COND_MEDIGUN_UBER_BULLET_RESIST: int",
			description: "Value: `58`"
		},
		TF_COND_MEDIGUN_UBER_BLAST_RESIST: {
			signature: "TF_COND_MEDIGUN_UBER_BLAST_RESIST: int",
			description: "Value: `59`"
		},
		TF_COND_MEDIGUN_UBER_FIRE_RESIST: {
			signature: "TF_COND_MEDIGUN_UBER_FIRE_RESIST: int",
			description: "Value: `60`"
		},
		TF_COND_MEDIGUN_SMALL_BULLET_RESIST: {
			signature: "TF_COND_MEDIGUN_SMALL_BULLET_RESIST: int",
			description: "Value: `61`"
		},
		TF_COND_MEDIGUN_SMALL_BLAST_RESIST: {
			signature: "TF_COND_MEDIGUN_SMALL_BLAST_RESIST: int",
			description: "Value: `62`"
		},
		TF_COND_MEDIGUN_SMALL_FIRE_RESIST: {
			signature: "TF_COND_MEDIGUN_SMALL_FIRE_RESIST: int",
			description: "Value: `63`"
		},
		TF_COND_STEALTHED_USER_BUFF: {
			signature: "TF_COND_STEALTHED_USER_BUFF: int",
			description: "Value: `64`"
		},
		TF_COND_MEDIGUN_DEBUFF: {
			signature: "TF_COND_MEDIGUN_DEBUFF: int",
			description: "Value: `65`"
		},
		TF_COND_STEALTHED_USER_BUFF_FADING: {
			signature: "TF_COND_STEALTHED_USER_BUFF_FADING: int",
			description: "Value: `66`"
		},
		TF_COND_BULLET_IMMUNE: {
			signature: "TF_COND_BULLET_IMMUNE: int",
			description: "Value: `67`"
		},
		TF_COND_BLAST_IMMUNE: {
			signature: "TF_COND_BLAST_IMMUNE: int",
			description: "Value: `68`"
		},
		TF_COND_FIRE_IMMUNE: {
			signature: "TF_COND_FIRE_IMMUNE: int",
			description: "Value: `69`"
		},
		TF_COND_PREVENT_DEATH: {
			signature: "TF_COND_PREVENT_DEATH: int",
			description: "Value: `70`"
		},
		TF_COND_MVM_BOT_STUN_RADIOWAVE: {
			signature: "TF_COND_MVM_BOT_STUN_RADIOWAVE: int",
			description: "Value: `71`"
		},
		TF_COND_HALLOWEEN_SPEED_BOOST: {
			signature: "TF_COND_HALLOWEEN_SPEED_BOOST: int",
			description: "Value: `72`"
		},
		TF_COND_HALLOWEEN_QUICK_HEAL: {
			signature: "TF_COND_HALLOWEEN_QUICK_HEAL: int",
			description: "Value: `73`"
		},
		TF_COND_HALLOWEEN_GIANT: {
			signature: "TF_COND_HALLOWEEN_GIANT: int",
			description: "Value: `74`"
		},
		TF_COND_HALLOWEEN_TINY: {
			signature: "TF_COND_HALLOWEEN_TINY: int",
			description: "Value: `75`"
		},
		TF_COND_HALLOWEEN_IN_HELL: {
			signature: "TF_COND_HALLOWEEN_IN_HELL: int",
			description: "Value: `76`"
		},
		TF_COND_HALLOWEEN_GHOST_MODE: {
			signature: "TF_COND_HALLOWEEN_GHOST_MODE: int",
			description: "Value: `77`"
		},
		TF_COND_MINICRITBOOSTED_ON_KILL: {
			signature: "TF_COND_MINICRITBOOSTED_ON_KILL: int",
			description: "Value: `78`"
		},
		TF_COND_OBSCURED_SMOKE: {
			signature: "TF_COND_OBSCURED_SMOKE: int",
			description: "Value: `79`"
		},
		TF_COND_PARACHUTE_ACTIVE: {
			signature: "TF_COND_PARACHUTE_ACTIVE: int",
			description: "Value: `80`"
		},
		TF_COND_BLASTJUMPING: {
			signature: "TF_COND_BLASTJUMPING: int",
			description: "Value: `81`"
		},
		TF_COND_HALLOWEEN_KART: {
			signature: "TF_COND_HALLOWEEN_KART: int",
			description: "Value: `82`"
		},
		TF_COND_HALLOWEEN_KART_DASH: {
			signature: "TF_COND_HALLOWEEN_KART_DASH: int",
			description: "Value: `83`"
		},
		TF_COND_BALLOON_HEAD: {
			signature: "TF_COND_BALLOON_HEAD: int",
			description: "Value: `84`"
		},
		TF_COND_MELEE_ONLY: {
			signature: "TF_COND_MELEE_ONLY: int",
			description: "Value: `85`"
		},
		TF_COND_SWIMMING_CURSE: {
			signature: "TF_COND_SWIMMING_CURSE: int",
			description: "Value: `86`"
		},
		TF_COND_FREEZE_INPUT: {
			signature: "TF_COND_FREEZE_INPUT: int",
			description: "Value: `87`"
		},
		TF_COND_HALLOWEEN_KART_CAGE: {
			signature: "TF_COND_HALLOWEEN_KART_CAGE: int",
			description: "Value: `88`"
		},
		TF_COND_DONOTUSE_0: {
			signature: "TF_COND_DONOTUSE_0: int",
			description: "Value: `89`"
		},
		TF_COND_RUNE_STRENGTH: {
			signature: "TF_COND_RUNE_STRENGTH: int",
			description: "Value: `90`"
		},
		TF_COND_RUNE_HASTE: {
			signature: "TF_COND_RUNE_HASTE: int",
			description: "Value: `91`"
		},
		TF_COND_RUNE_REGEN: {
			signature: "TF_COND_RUNE_REGEN: int",
			description: "Value: `92`"
		},
		TF_COND_RUNE_RESIST: {
			signature: "TF_COND_RUNE_RESIST: int",
			description: "Value: `93`"
		},
		TF_COND_RUNE_VAMPIRE: {
			signature: "TF_COND_RUNE_VAMPIRE: int",
			description: "Value: `94`"
		},
		TF_COND_RUNE_REFLECT: {
			signature: "TF_COND_RUNE_REFLECT: int",
			description: "Value: `95`"
		},
		TF_COND_RUNE_PRECISION: {
			signature: "TF_COND_RUNE_PRECISION: int",
			description: "Value: `96`"
		},
		TF_COND_RUNE_AGILITY: {
			signature: "TF_COND_RUNE_AGILITY: int",
			description: "Value: `97`"
		},
		TF_COND_GRAPPLINGHOOK: {
			signature: "TF_COND_GRAPPLINGHOOK: int",
			description: "Value: `98`"
		},
		TF_COND_GRAPPLINGHOOK_SAFEFALL: {
			signature: "TF_COND_GRAPPLINGHOOK_SAFEFALL: int",
			description: "Value: `99`"
		},
		TF_COND_GRAPPLINGHOOK_LATCHED: {
			signature: "TF_COND_GRAPPLINGHOOK_LATCHED: int",
			description: "Value: `100`"
		},
		TF_COND_GRAPPLINGHOOK_BLEEDING: {
			signature: "TF_COND_GRAPPLINGHOOK_BLEEDING: int",
			description: "Value: `101`"
		},
		TF_COND_AFTERBURN_IMMUNE: {
			signature: "TF_COND_AFTERBURN_IMMUNE: int",
			description: "Value: `102`"
		},
		TF_COND_RUNE_KNOCKOUT: {
			signature: "TF_COND_RUNE_KNOCKOUT: int",
			description: "Value: `103`"
		},
		TF_COND_RUNE_IMBALANCE: {
			signature: "TF_COND_RUNE_IMBALANCE: int",
			description: "Value: `104`"
		},
		TF_COND_CRITBOOSTED_RUNE_TEMP: {
			signature: "TF_COND_CRITBOOSTED_RUNE_TEMP: int",
			description: "Value: `105`"
		},
		TF_COND_PASSTIME_INTERCEPTION: {
			signature: "TF_COND_PASSTIME_INTERCEPTION: int",
			description: "Value: `106`"
		},
		TF_COND_SWIMMING_NO_EFFECTS: {
			signature: "TF_COND_SWIMMING_NO_EFFECTS: int",
			description: "Value: `107`"
		},
		TF_COND_PURGATORY: {
			signature: "TF_COND_PURGATORY: int",
			description: "Value: `108`"
		},
		TF_COND_RUNE_KING: {
			signature: "TF_COND_RUNE_KING: int",
			description: "Value: `109`"
		},
		TF_COND_RUNE_PLAGUE: {
			signature: "TF_COND_RUNE_PLAGUE: int",
			description: "Value: `110`"
		},
		TF_COND_RUNE_SUPERNOVA: {
			signature: "TF_COND_RUNE_SUPERNOVA: int",
			description: "Value: `111`"
		},
		TF_COND_PLAGUE: {
			signature: "TF_COND_PLAGUE: int",
			description: "Value: `112`"
		},
		TF_COND_KING_BUFFED: {
			signature: "TF_COND_KING_BUFFED: int",
			description: "Value: `113`"
		},
		TF_COND_TEAM_GLOWS: {
			signature: "TF_COND_TEAM_GLOWS: int",
			description: "Value: `114`"
		},
		TF_COND_KNOCKED_INTO_AIR: {
			signature: "TF_COND_KNOCKED_INTO_AIR: int",
			description: "Value: `115`"
		},
		TF_COND_COMPETITIVE_WINNER: {
			signature: "TF_COND_COMPETITIVE_WINNER: int",
			description: "Value: `116`"
		},
		TF_COND_COMPETITIVE_LOSER: {
			signature: "TF_COND_COMPETITIVE_LOSER: int",
			description: "Value: `117`"
		},
		TF_COND_HEALING_DEBUFF: {
			signature: "TF_COND_HEALING_DEBUFF: int",
			description: "Value: `118`"
		},
		TF_COND_PASSTIME_PENALTY_DEBUFF: {
			signature: "TF_COND_PASSTIME_PENALTY_DEBUFF: int",
			description: "Value: `119`"
		},
		TF_COND_GRAPPLED_TO_PLAYER: {
			signature: "TF_COND_GRAPPLED_TO_PLAYER: int",
			description: "Value: `120`"
		},
		TF_COND_GRAPPLED_BY_PLAYER: {
			signature: "TF_COND_GRAPPLED_BY_PLAYER: int",
			description: "Value: `121`"
		},
		TF_COND_PARACHUTE_DEPLOYED: {
			signature: "TF_COND_PARACHUTE_DEPLOYED: int",
			description: "Value: `122`"
		},
		TF_COND_GAS: {
			signature: "TF_COND_GAS: int",
			description: "Value: `123`"
		},
		TF_COND_BURNING_PYRO: {
			signature: "TF_COND_BURNING_PYRO: int",
			description: "Value: `124`"
		},
		TF_COND_ROCKETPACK: {
			signature: "TF_COND_ROCKETPACK: int",
			description: "Value: `125`"
		},
		TF_COND_LOST_FOOTING: {
			signature: "TF_COND_LOST_FOOTING: int",
			description: "Value: `126`"
		},
		TF_COND_AIR_CURRENT: {
			signature: "TF_COND_AIR_CURRENT: int",
			description: "Value: `127`"
		},
		TF_COND_HALLOWEEN_HELL_HEAL: {
			signature: "TF_COND_HALLOWEEN_HELL_HEAL: int",
			description: "Value: `128`"
		},
		TF_COND_POWERUPMODE_DOMINANT: {
			signature: "TF_COND_POWERUPMODE_DOMINANT: int",
			description: "Value: `129`"
		},
		TF_COND_IMMUNE_TO_PUSHBACK: {
			signature: "TF_COND_IMMUNE_TO_PUSHBACK: int",
			description: "Value: `130`"
		},
		TF_COND_INVALID: {
			signature: "TF_COND_INVALID: int",
			description: "Value: `-1`"
		}
	},
	ETFDmgCustom: {
		TF_DMG_CUSTOM_NONE: {
			signature: "TF_DMG_CUSTOM_NONE: int",
			description: "Value: `0`"
		},
		TF_DMG_CUSTOM_HEADSHOT: {
			signature: "TF_DMG_CUSTOM_HEADSHOT: int",
			description: "Value: `1`"
		},
		TF_DMG_CUSTOM_BACKSTAB: {
			signature: "TF_DMG_CUSTOM_BACKSTAB: int",
			description: "Value: `2`"
		},
		TF_DMG_CUSTOM_BURNING: {
			signature: "TF_DMG_CUSTOM_BURNING: int",
			description: "Value: `3`"
		},
		TF_DMG_WRENCH_FIX: {
			signature: "TF_DMG_WRENCH_FIX: int",
			description: "Value: `4`"
		},
		TF_DMG_CUSTOM_MINIGUN: {
			signature: "TF_DMG_CUSTOM_MINIGUN: int",
			description: "Value: `5`"
		},
		TF_DMG_CUSTOM_SUICIDE: {
			signature: "TF_DMG_CUSTOM_SUICIDE: int",
			description: "Value: `6`"
		},
		TF_DMG_CUSTOM_TAUNTATK_HADOUKEN: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_HADOUKEN: int",
			description: "Value: `7`"
		},
		TF_DMG_CUSTOM_BURNING_FLARE: {
			signature: "TF_DMG_CUSTOM_BURNING_FLARE: int",
			description: "Value: `8`"
		},
		TF_DMG_CUSTOM_TAUNTATK_HIGH_NOON: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_HIGH_NOON: int",
			description: "Value: `9`"
		},
		TF_DMG_CUSTOM_TAUNTATK_GRAND_SLAM: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_GRAND_SLAM: int",
			description: "Value: `10`"
		},
		TF_DMG_CUSTOM_PENETRATE_MY_TEAM: {
			signature: "TF_DMG_CUSTOM_PENETRATE_MY_TEAM: int",
			description: "Value: `11`"
		},
		TF_DMG_CUSTOM_PENETRATE_ALL_PLAYERS: {
			signature: "TF_DMG_CUSTOM_PENETRATE_ALL_PLAYERS: int",
			description: "Value: `12`"
		},
		TF_DMG_CUSTOM_TAUNTATK_FENCING: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_FENCING: int",
			description: "Value: `13`"
		},
		TF_DMG_CUSTOM_PENETRATE_NONBURNING_TEAMMATE: {
			signature: "TF_DMG_CUSTOM_PENETRATE_NONBURNING_TEAMMATE: int",
			description: "Value: `14`"
		},
		TF_DMG_CUSTOM_TAUNTATK_ARROW_STAB: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_ARROW_STAB: int",
			description: "Value: `15`"
		},
		TF_DMG_CUSTOM_TELEFRAG: {
			signature: "TF_DMG_CUSTOM_TELEFRAG: int",
			description: "Value: `16`"
		},
		TF_DMG_CUSTOM_BURNING_ARROW: {
			signature: "TF_DMG_CUSTOM_BURNING_ARROW: int",
			description: "Value: `17`"
		},
		TF_DMG_CUSTOM_FLYINGBURN: {
			signature: "TF_DMG_CUSTOM_FLYINGBURN: int",
			description: "Value: `18`"
		},
		TF_DMG_CUSTOM_PUMPKIN_BOMB: {
			signature: "TF_DMG_CUSTOM_PUMPKIN_BOMB: int",
			description: "Value: `19`"
		},
		TF_DMG_CUSTOM_DECAPITATION: {
			signature: "TF_DMG_CUSTOM_DECAPITATION: int",
			description: "Value: `20`"
		},
		TF_DMG_CUSTOM_TAUNTATK_GRENADE: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_GRENADE: int",
			description: "Value: `21`"
		},
		TF_DMG_CUSTOM_BASEBALL: {
			signature: "TF_DMG_CUSTOM_BASEBALL: int",
			description: "Value: `22`"
		},
		TF_DMG_CUSTOM_CHARGE_IMPACT: {
			signature: "TF_DMG_CUSTOM_CHARGE_IMPACT: int",
			description: "Value: `23`"
		},
		TF_DMG_CUSTOM_TAUNTATK_BARBARIAN_SWING: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_BARBARIAN_SWING: int",
			description: "Value: `24`"
		},
		TF_DMG_CUSTOM_AIR_STICKY_BURST: {
			signature: "TF_DMG_CUSTOM_AIR_STICKY_BURST: int",
			description: "Value: `25`"
		},
		TF_DMG_CUSTOM_DEFENSIVE_STICKY: {
			signature: "TF_DMG_CUSTOM_DEFENSIVE_STICKY: int",
			description: "Value: `26`"
		},
		TF_DMG_CUSTOM_PICKAXE: {
			signature: "TF_DMG_CUSTOM_PICKAXE: int",
			description: "Value: `27`"
		},
		TF_DMG_CUSTOM_ROCKET_DIRECTHIT: {
			signature: "TF_DMG_CUSTOM_ROCKET_DIRECTHIT: int",
			description: "Value: `28`"
		},
		TF_DMG_CUSTOM_TAUNTATK_UBERSLICE: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_UBERSLICE: int",
			description: "Value: `29`"
		},
		TF_DMG_CUSTOM_PLAYER_SENTRY: {
			signature: "TF_DMG_CUSTOM_PLAYER_SENTRY: int",
			description: "Value: `30`"
		},
		TF_DMG_CUSTOM_STANDARD_STICKY: {
			signature: "TF_DMG_CUSTOM_STANDARD_STICKY: int",
			description: "Value: `31`"
		},
		TF_DMG_CUSTOM_SHOTGUN_REVENGE_CRIT: {
			signature: "TF_DMG_CUSTOM_SHOTGUN_REVENGE_CRIT: int",
			description: "Value: `32`"
		},
		TF_DMG_CUSTOM_TAUNTATK_ENGINEER_GUITAR_SMASH: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_ENGINEER_GUITAR_SMASH: int",
			description: "Value: `33`"
		},
		TF_DMG_CUSTOM_BLEEDING: {
			signature: "TF_DMG_CUSTOM_BLEEDING: int",
			description: "Value: `34`"
		},
		TF_DMG_CUSTOM_GOLD_WRENCH: {
			signature: "TF_DMG_CUSTOM_GOLD_WRENCH: int",
			description: "Value: `35`"
		},
		TF_DMG_CUSTOM_CARRIED_BUILDING: {
			signature: "TF_DMG_CUSTOM_CARRIED_BUILDING: int",
			description: "Value: `36`"
		},
		TF_DMG_CUSTOM_COMBO_PUNCH: {
			signature: "TF_DMG_CUSTOM_COMBO_PUNCH: int",
			description: "Value: `37`"
		},
		TF_DMG_CUSTOM_TAUNTATK_ENGINEER_ARM_KILL: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_ENGINEER_ARM_KILL: int",
			description: "Value: `38`"
		},
		TF_DMG_CUSTOM_FISH_KILL: {
			signature: "TF_DMG_CUSTOM_FISH_KILL: int",
			description: "Value: `39`"
		},
		TF_DMG_CUSTOM_TRIGGER_HURT: {
			signature: "TF_DMG_CUSTOM_TRIGGER_HURT: int",
			description: "Value: `40`"
		},
		TF_DMG_CUSTOM_DECAPITATION_BOSS: {
			signature: "TF_DMG_CUSTOM_DECAPITATION_BOSS: int",
			description: "Value: `41`"
		},
		TF_DMG_CUSTOM_STICKBOMB_EXPLOSION: {
			signature: "TF_DMG_CUSTOM_STICKBOMB_EXPLOSION: int",
			description: "Value: `42`"
		},
		TF_DMG_CUSTOM_AEGIS_ROUND: {
			signature: "TF_DMG_CUSTOM_AEGIS_ROUND: int",
			description: "Value: `43`"
		},
		TF_DMG_CUSTOM_FLARE_EXPLOSION: {
			signature: "TF_DMG_CUSTOM_FLARE_EXPLOSION: int",
			description: "Value: `44`"
		},
		TF_DMG_CUSTOM_BOOTS_STOMP: {
			signature: "TF_DMG_CUSTOM_BOOTS_STOMP: int",
			description: "Value: `45`"
		},
		TF_DMG_CUSTOM_PLASMA: {
			signature: "TF_DMG_CUSTOM_PLASMA: int",
			description: "Value: `46`"
		},
		TF_DMG_CUSTOM_PLASMA_CHARGED: {
			signature: "TF_DMG_CUSTOM_PLASMA_CHARGED: int",
			description: "Value: `47`"
		},
		TF_DMG_CUSTOM_PLASMA_GIB: {
			signature: "TF_DMG_CUSTOM_PLASMA_GIB: int",
			description: "Value: `48`"
		},
		TF_DMG_CUSTOM_PRACTICE_STICKY: {
			signature: "TF_DMG_CUSTOM_PRACTICE_STICKY: int",
			description: "Value: `49`"
		},
		TF_DMG_CUSTOM_EYEBALL_ROCKET: {
			signature: "TF_DMG_CUSTOM_EYEBALL_ROCKET: int",
			description: "Value: `50`"
		},
		TF_DMG_CUSTOM_HEADSHOT_DECAPITATION: {
			signature: "TF_DMG_CUSTOM_HEADSHOT_DECAPITATION: int",
			description: "Value: `51`"
		},
		TF_DMG_CUSTOM_TAUNTATK_ARMAGEDDON: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_ARMAGEDDON: int",
			description: "Value: `52`"
		},
		TF_DMG_CUSTOM_FLARE_PELLET: {
			signature: "TF_DMG_CUSTOM_FLARE_PELLET: int",
			description: "Value: `53`"
		},
		TF_DMG_CUSTOM_CLEAVER: {
			signature: "TF_DMG_CUSTOM_CLEAVER: int",
			description: "Value: `54`"
		},
		TF_DMG_CUSTOM_CLEAVER_CRIT: {
			signature: "TF_DMG_CUSTOM_CLEAVER_CRIT: int",
			description: "Value: `55`"
		},
		TF_DMG_CUSTOM_SAPPER_RECORDER_DEATH: {
			signature: "TF_DMG_CUSTOM_SAPPER_RECORDER_DEATH: int",
			description: "Value: `56`"
		},
		TF_DMG_CUSTOM_MERASMUS_PLAYER_BOMB: {
			signature: "TF_DMG_CUSTOM_MERASMUS_PLAYER_BOMB: int",
			description: "Value: `57`"
		},
		TF_DMG_CUSTOM_MERASMUS_GRENADE: {
			signature: "TF_DMG_CUSTOM_MERASMUS_GRENADE: int",
			description: "Value: `58`"
		},
		TF_DMG_CUSTOM_MERASMUS_ZAP: {
			signature: "TF_DMG_CUSTOM_MERASMUS_ZAP: int",
			description: "Value: `59`"
		},
		TF_DMG_CUSTOM_MERASMUS_DECAPITATION: {
			signature: "TF_DMG_CUSTOM_MERASMUS_DECAPITATION: int",
			description: "Value: `60`"
		},
		TF_DMG_CUSTOM_CANNONBALL_PUSH: {
			signature: "TF_DMG_CUSTOM_CANNONBALL_PUSH: int",
			description: "Value: `61`"
		},
		TF_DMG_CUSTOM_TAUNTATK_ALLCLASS_GUITAR_RIFF: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_ALLCLASS_GUITAR_RIFF: int",
			description: "Value: `62`"
		},
		TF_DMG_CUSTOM_THROWABLE: {
			signature: "TF_DMG_CUSTOM_THROWABLE: int",
			description: "Value: `63`"
		},
		TF_DMG_CUSTOM_THROWABLE_KILL: {
			signature: "TF_DMG_CUSTOM_THROWABLE_KILL: int",
			description: "Value: `64`"
		},
		TF_DMG_CUSTOM_SPELL_TELEPORT: {
			signature: "TF_DMG_CUSTOM_SPELL_TELEPORT: int",
			description: "Value: `65`"
		},
		TF_DMG_CUSTOM_SPELL_SKELETON: {
			signature: "TF_DMG_CUSTOM_SPELL_SKELETON: int",
			description: "Value: `66`"
		},
		TF_DMG_CUSTOM_SPELL_MIRV: {
			signature: "TF_DMG_CUSTOM_SPELL_MIRV: int",
			description: "Value: `67`"
		},
		TF_DMG_CUSTOM_SPELL_METEOR: {
			signature: "TF_DMG_CUSTOM_SPELL_METEOR: int",
			description: "Value: `68`"
		},
		TF_DMG_CUSTOM_SPELL_LIGHTNING: {
			signature: "TF_DMG_CUSTOM_SPELL_LIGHTNING: int",
			description: "Value: `69`"
		},
		TF_DMG_CUSTOM_SPELL_FIREBALL: {
			signature: "TF_DMG_CUSTOM_SPELL_FIREBALL: int",
			description: "Value: `70`"
		},
		TF_DMG_CUSTOM_SPELL_MONOCULUS: {
			signature: "TF_DMG_CUSTOM_SPELL_MONOCULUS: int",
			description: "Value: `71`"
		},
		TF_DMG_CUSTOM_SPELL_BLASTJUMP: {
			signature: "TF_DMG_CUSTOM_SPELL_BLASTJUMP: int",
			description: "Value: `72`"
		},
		TF_DMG_CUSTOM_SPELL_BATS: {
			signature: "TF_DMG_CUSTOM_SPELL_BATS: int",
			description: "Value: `73`"
		},
		TF_DMG_CUSTOM_SPELL_TINY: {
			signature: "TF_DMG_CUSTOM_SPELL_TINY: int",
			description: "Value: `74`"
		},
		TF_DMG_CUSTOM_KART: {
			signature: "TF_DMG_CUSTOM_KART: int",
			description: "Value: `75`"
		},
		TF_DMG_CUSTOM_GIANT_HAMMER: {
			signature: "TF_DMG_CUSTOM_GIANT_HAMMER: int",
			description: "Value: `76`"
		},
		TF_DMG_CUSTOM_RUNE_REFLECT: {
			signature: "TF_DMG_CUSTOM_RUNE_REFLECT: int",
			description: "Value: `77`"
		},
		TF_DMG_CUSTOM_DRAGONS_FURY_IGNITE: {
			signature: "TF_DMG_CUSTOM_DRAGONS_FURY_IGNITE: int",
			description: "Value: `78`"
		},
		TF_DMG_CUSTOM_DRAGONS_FURY_BONUS_BURNING: {
			signature: "TF_DMG_CUSTOM_DRAGONS_FURY_BONUS_BURNING: int",
			description: "Value: `79`"
		},
		TF_DMG_CUSTOM_SLAP_KILL: {
			signature: "TF_DMG_CUSTOM_SLAP_KILL: int",
			description: "Value: `80`"
		},
		TF_DMG_CUSTOM_CROC: {
			signature: "TF_DMG_CUSTOM_CROC: int",
			description: "Value: `81`"
		},
		TF_DMG_CUSTOM_TAUNTATK_GASBLAST: {
			signature: "TF_DMG_CUSTOM_TAUNTATK_GASBLAST: int",
			description: "Value: `82`"
		},
		TF_DMG_CUSTOM_AXTINGUISHER_BOOSTED: {
			signature: "TF_DMG_CUSTOM_AXTINGUISHER_BOOSTED: int",
			description: "Value: `83`"
		},
		TF_DMG_CUSTOM_KRAMPUS_MELEE: {
			signature: "TF_DMG_CUSTOM_KRAMPUS_MELEE: int",
			description: "Value: `84`"
		},
		TF_DMG_CUSTOM_KRAMPUS_RANGED: {
			signature: "TF_DMG_CUSTOM_KRAMPUS_RANGED: int",
			description: "Value: `85`"
		},
		TF_DMG_CUSTOM_END: {
			signature: "TF_DMG_CUSTOM_END: int",
			description: "Value: `86`"
		}
	},
	ETFTeam: {
		TEAM_UNASSIGNED: {
			signature: "TEAM_UNASSIGNED: int",
			description: "Value: `null`\n\nBug: This is supposed to be 0"
		},
		TEAM_SPECTATOR: {
			signature: "TEAM_SPECTATOR: int",
			description: "Value: `1`"
		},
		TF_TEAM_PVE_DEFENDERS: {
			signature: "TF_TEAM_PVE_DEFENDERS: int",
			description: "Value: `2`"
		},
		TF_TEAM_RED: {
			signature: "TF_TEAM_RED: int",
			description: "Value: `2`"
		},
		TF_TEAM_BLUE: {
			signature: "TF_TEAM_BLUE: int",
			description: "Value: `3`"
		},
		TF_TEAM_PVE_INVADERS: {
			signature: "TF_TEAM_PVE_INVADERS: int",
			description: "Value: `3`"
		},
		TF_TEAM_COUNT: {
			signature: "TF_TEAM_COUNT: int",
			description: "Value: `4`"
		},
		TF_TEAM_PVE_INVADERS_GIANTS: {
			signature: "TF_TEAM_PVE_INVADERS_GIANTS: int",
			description: "Value: `4`"
		},
		TEAM_ANY: {
			signature: "TEAM_ANY: int",
			description: "Value: `-2`"
		},
		TEAM_INVALID: {
			signature: "TEAM_INVALID: int",
			description: "Value: `-1`"
		}
	},
	Math: {
		Zero: {
			signature: "Zero: int",
			description: "Value: `0`"
		},
		Epsilon: {
			signature: "Epsilon: float",
			description: "Value: `1`.19209e-07"
		},
		GoldenRatio: {
			signature: "GoldenRatio: float",
			description: "Value: `1`.61803"
		},
		One: {
			signature: "One: int",
			description: "Value: `1`"
		},
		Sqrt2: {
			signature: "Sqrt2: float",
			description: "Value: `1`.41421"
		},
		Sqrt3: {
			signature: "Sqrt3: float",
			description: "Value: `1`.73205"
		},
		E: {
			signature: "E: float",
			description: "Value: `2`.71828"
		},
		Pi: {
			signature: "Pi: float",
			description: "Value: `3`.14159"
		},
		Tau: {
			signature: "Tau: int",
			description: "Value: `6`.28319"
		}
	},
	Server: {
		ConstantNamingConvention: {
			signature: "ConstantNamingConvention: string",
			description: "Value: \"Constants are named as follows: F -> flags, E -> enums, (nothing) -> random values/constants\""
		},
		DIST_EPSILON: {
			signature: "DIST_EPSILON: float",
			description: "Value: `0`.03125"
		},
		MAX_PLAYERS: {
			signature: "MAX_PLAYERS: int",
			description: "Value: `101`"
		},
		MAX_EDICTS: {
			signature: "MAX_EDICTS: int",
			description: "Value: `2048`"
		}
	},
	FButtons: {
		IN_ATTACK: {
			signature: "IN_ATTACK: int",
			description: "Value: `1`"
		},
		IN_JUMP: {
			signature: "IN_JUMP: int",
			description: "Value: `2`"
		},
		IN_DUCK: {
			signature: "IN_DUCK: int",
			description: "Value: `4`"
		},
		IN_FORWARD: {
			signature: "IN_FORWARD: int",
			description: "Value: `8`"
		},
		IN_BACK: {
			signature: "IN_BACK: int",
			description: "Value: `16`"
		},
		IN_USE: {
			signature: "IN_USE: int",
			description: "Value: `32`"
		},
		IN_CANCEL: {
			signature: "IN_CANCEL: int",
			description: "Value: `64`"
		},
		IN_LEFT: {
			signature: "IN_LEFT: int",
			description: "Value: `128`"
		},
		IN_RIGHT: {
			signature: "IN_RIGHT: int",
			description: "Value: `256`"
		},
		IN_MOVELEFT: {
			signature: "IN_MOVELEFT: int",
			description: "Value: `512`"
		},
		IN_MOVERIGHT: {
			signature: "IN_MOVERIGHT: int",
			description: "Value: `1024`"
		},
		IN_ATTACK2: {
			signature: "IN_ATTACK2: int",
			description: "Value: `2048`"
		},
		IN_RUN: {
			signature: "IN_RUN: int",
			description: "Value: `4096`"
		},
		IN_RELOAD: {
			signature: "IN_RELOAD: int",
			description: "Value: `8192`"
		},
		IN_ALT1: {
			signature: "IN_ALT1: int",
			description: "Value: `16384`"
		},
		IN_ALT2: {
			signature: "IN_ALT2: int",
			description: "Value: `32768`"
		},
		IN_SCORE: {
			signature: "IN_SCORE: int",
			description: "Value: `65536`"
		},
		IN_SPEED: {
			signature: "IN_SPEED: int",
			description: "Value: `131072`"
		},
		IN_WALK: {
			signature: "IN_WALK: int",
			description: "Value: `262144`"
		},
		IN_ZOOM: {
			signature: "IN_ZOOM: int",
			description: "Value: `524288`"
		},
		IN_WEAPON1: {
			signature: "IN_WEAPON1: int",
			description: "Value: `1048576`"
		},
		IN_WEAPON2: {
			signature: "IN_WEAPON2: int",
			description: "Value: `2097152`"
		},
		IN_BULLRUSH: {
			signature: "IN_BULLRUSH: int",
			description: "Value: `4194304`"
		},
		IN_GRENADE1: {
			signature: "IN_GRENADE1: int",
			description: "Value: `8388608`"
		},
		IN_GRENADE2: {
			signature: "IN_GRENADE2: int",
			description: "Value: `16777216`"
		},
		IN_ATTACK3: {
			signature: "IN_ATTACK3: int",
			description: "Value: `33554432`"
		}
	},
	FContents: {
		CONTENTS_EMPTY: {
			signature: "CONTENTS_EMPTY: null",
			description: "Value: `null`\n\nBug: This is supposed to be 0"
		},
		CONTENTS_SOLID: {
			signature: "CONTENTS_SOLID: int",
			description: "Value: `1`"
		},
		CONTENTS_WINDOW: {
			signature: "CONTENTS_WINDOW: int",
			description: "Value: `2`"
		},
		CONTENTS_AUX: {
			signature: "CONTENTS_AUX: int",
			description: "Value: `4`"
		},
		CONTENTS_GRATE: {
			signature: "CONTENTS_GRATE: int",
			description: "Value: `8`"
		},
		CONTENTS_SLIME: {
			signature: "CONTENTS_SLIME: int",
			description: "Value: `16`"
		},
		CONTENTS_WATER: {
			signature: "CONTENTS_WATER: int",
			description: "Value: `32`"
		},
		CONTENTS_BLOCKLOS: {
			signature: "CONTENTS_BLOCKLOS: int",
			description: "Value: `64`"
		},
		CONTENTS_OPAQUE: {
			signature: "CONTENTS_OPAQUE: int",
			description: "Value: `128`"
		},
		LAST_VISIBLE_CONTENTS: {
			signature: "LAST_VISIBLE_CONTENTS: int",
			description: "Value: `128`"
		},
		ALL_VISIBLE_CONTENTS: {
			signature: "ALL_VISIBLE_CONTENTS: int",
			description: "Value: `255`"
		},
		CONTENTS_TESTFOGVOLUME: {
			signature: "CONTENTS_TESTFOGVOLUME: int",
			description: "Value: `256`"
		},
		CONTENTS_UNUSED: {
			signature: "CONTENTS_UNUSED: int",
			description: "Value: `512`"
		},
		CONTENTS_UNUSED6: {
			signature: "CONTENTS_UNUSED6: int",
			description: "Value: `1024`"
		},
		CONTENTS_TEAM1: {
			signature: "CONTENTS_TEAM1: int",
			description: "Value: `2048`"
		},
		CONTENTS_TEAM2: {
			signature: "CONTENTS_TEAM2: int",
			description: "Value: `4096`"
		},
		CONTENTS_IGNORE_NODRAW_OPAQUE: {
			signature: "CONTENTS_IGNORE_NODRAW_OPAQUE: int",
			description: "Value: `8192`"
		},
		CONTENTS_MOVEABLE: {
			signature: "CONTENTS_MOVEABLE: int",
			description: "Value: `16384`"
		},
		CONTENTS_AREAPORTAL: {
			signature: "CONTENTS_AREAPORTAL: int",
			description: "Value: `32768`"
		},
		CONTENTS_PLAYERCLIP: {
			signature: "CONTENTS_PLAYERCLIP: int",
			description: "Value: `65536`"
		},
		CONTENTS_MONSTERCLIP: {
			signature: "CONTENTS_MONSTERCLIP: int",
			description: "Value: `131072`"
		},
		CONTENTS_CURRENT_0: {
			signature: "CONTENTS_CURRENT_0: int",
			description: "Value: `262144`"
		},
		CONTENTS_CURRENT_90: {
			signature: "CONTENTS_CURRENT_90: int",
			description: "Value: `524288`"
		},
		CONTENTS_CURRENT_180: {
			signature: "CONTENTS_CURRENT_180: int",
			description: "Value: `1048576`"
		},
		CONTENTS_CURRENT_270: {
			signature: "CONTENTS_CURRENT_270: int",
			description: "Value: `2097152`"
		},
		CONTENTS_CURRENT_UP: {
			signature: "CONTENTS_CURRENT_UP: int",
			description: "Value: `4194304`"
		},
		CONTENTS_CURRENT_DOWN: {
			signature: "CONTENTS_CURRENT_DOWN: int",
			description: "Value: `8388608`"
		},
		CONTENTS_ORIGIN: {
			signature: "CONTENTS_ORIGIN: int",
			description: "Value: `16777216`"
		},
		CONTENTS_MONSTER: {
			signature: "CONTENTS_MONSTER: int",
			description: "Value: `33554432`"
		},
		CONTENTS_DEBRIS: {
			signature: "CONTENTS_DEBRIS: int",
			description: "Value: `67108864`"
		},
		CONTENTS_DETAIL: {
			signature: "CONTENTS_DETAIL: int",
			description: "Value: `134217728`"
		},
		CONTENTS_TRANSLUCENT: {
			signature: "CONTENTS_TRANSLUCENT: int",
			description: "Value: `268435456`"
		},
		CONTENTS_LADDER: {
			signature: "CONTENTS_LADDER: int",
			description: "Value: `536870912`"
		},
		CONTENTS_HITBOX: {
			signature: "CONTENTS_HITBOX: int",
			description: "Value: `1073741824`"
		}
	},
	FDmgType: {
		DMG_GENERIC: {
			signature: "DMG_GENERIC: null",
			description: "Value: `null`\n\nBug: This is supposed to be 0"
		},
		DMG_CRUSH: {
			signature: "DMG_CRUSH: int",
			description: "Value: `1`"
		},
		DMG_BULLET: {
			signature: "DMG_BULLET: int",
			description: "Value: `2`"
		},
		DMG_SLASH: {
			signature: "DMG_SLASH: int",
			description: "Value: `4`"
		},
		DMG_BURN: {
			signature: "DMG_BURN: int",
			description: "Value: `8`"
		},
		DMG_VEHICLE: {
			signature: "DMG_VEHICLE: int",
			description: "Value: `16`"
		},
		DMG_FALL: {
			signature: "DMG_FALL: int",
			description: "Value: `32`"
		},
		DMG_BLAST: {
			signature: "DMG_BLAST: int",
			description: "Value: `64`"
		},
		DMG_CLUB: {
			signature: "DMG_CLUB: int",
			description: "Value: `128`"
		},
		DMG_SHOCK: {
			signature: "DMG_SHOCK: int",
			description: "Value: `256`"
		},
		DMG_SONIC: {
			signature: "DMG_SONIC: int",
			description: "Value: `512`"
		},
		DMG_ENERGYBEAM: {
			signature: "DMG_ENERGYBEAM: int",
			description: "Value: `1024`"
		},
		DMG_PREVENT_PHYSICS_FORCE: {
			signature: "DMG_PREVENT_PHYSICS_FORCE: int",
			description: "Value: `2048`"
		},
		DMG_NEVERGIB: {
			signature: "DMG_NEVERGIB: int",
			description: "Value: `4096`"
		},
		DMG_ALWAYSGIB: {
			signature: "DMG_ALWAYSGIB: int",
			description: "Value: `8192`"
		},
		DMG_DROWN: {
			signature: "DMG_DROWN: int",
			description: "Value: `16384`"
		},
		DMG_PARALYZE: {
			signature: "DMG_PARALYZE: int",
			description: "Value: `32768`"
		},
		DMG_NERVEGAS: {
			signature: "DMG_NERVEGAS: int",
			description: "Value: `65536`"
		},
		DMG_POISON: {
			signature: "DMG_POISON: int",
			description: "Value: `131072`"
		},
		DMG_RADIATION: {
			signature: "DMG_RADIATION: int",
			description: "Value: `262144`"
		},
		DMG_DROWNRECOVER: {
			signature: "DMG_DROWNRECOVER: int",
			description: "Value: `524288`"
		},
		DMG_ACID: {
			signature: "DMG_ACID: int",
			description: "Value: `1048576`"
		},
		DMG_SLOWBURN: {
			signature: "DMG_SLOWBURN: int",
			description: "Value: `2097152`"
		},
		DMG_REMOVENORAGDOLL: {
			signature: "DMG_REMOVENORAGDOLL: int",
			description: "Value: `4194304`"
		},
		DMG_PHYSGUN: {
			signature: "DMG_PHYSGUN: int",
			description: "Value: `8388608`"
		},
		DMG_PLASMA: {
			signature: "DMG_PLASMA: int",
			description: "Value: `16777216`"
		},
		DMG_AIRBOAT: {
			signature: "DMG_AIRBOAT: int",
			description: "Value: `33554432`"
		},
		DMG_DISSOLVE: {
			signature: "DMG_DISSOLVE: int",
			description: "Value: `67108864`"
		},
		DMG_BLAST_SURFACE: {
			signature: "DMG_BLAST_SURFACE: int",
			description: "Value: `134217728`"
		},
		DMG_DIRECT: {
			signature: "DMG_DIRECT: int",
			description: "Value: `268435456`"
		},
		DMG_BUCKSHOT: {
			signature: "DMG_BUCKSHOT: int",
			description: "Value: `536870912`"
		}
	},
	FEntityEffects: {
		EF_BONEMERGE: {
			signature: "EF_BONEMERGE: int",
			description: "Value: `1`"
		},
		EF_BRIGHTLIGHT: {
			signature: "EF_BRIGHTLIGHT: int",
			description: "Value: `2`"
		},
		EF_DIMLIGHT: {
			signature: "EF_DIMLIGHT: int",
			description: "Value: `4`"
		},
		EF_NOINTERP: {
			signature: "EF_NOINTERP: int",
			description: "Value: `8`"
		},
		EF_MAX_BITS: {
			signature: "EF_MAX_BITS: int",
			description: "Value: `10`"
		},
		EF_NOSHADOW: {
			signature: "EF_NOSHADOW: int",
			description: "Value: `16`"
		},
		EF_NODRAW: {
			signature: "EF_NODRAW: int",
			description: "Value: `32`"
		},
		EF_NORECEIVESHADOW: {
			signature: "EF_NORECEIVESHADOW: int",
			description: "Value: `64`"
		},
		EF_BONEMERGE_FASTCULL: {
			signature: "EF_BONEMERGE_FASTCULL: int",
			description: "Value: `128`"
		},
		EF_ITEM_BLINK: {
			signature: "EF_ITEM_BLINK: int",
			description: "Value: `256`"
		},
		EF_PARENT_ANIMATES: {
			signature: "EF_PARENT_ANIMATES: int",
			description: "Value: `512`"
		}
	},
	FEntityEFlags: {
		EFL_KILLME: {
			signature: "EFL_KILLME: int",
			description: "Value: `1`"
		},
		EFL_DORMANT: {
			signature: "EFL_DORMANT: int",
			description: "Value: `2`"
		},
		EFL_NOCLIP_ACTIVE: {
			signature: "EFL_NOCLIP_ACTIVE: int",
			description: "Value: `4`"
		},
		EFL_SETTING_UP_BONES: {
			signature: "EFL_SETTING_UP_BONES: int",
			description: "Value: `8`"
		},
		EFL_HAS_PLAYER_CHILD: {
			signature: "EFL_HAS_PLAYER_CHILD: int",
			description: "Value: `16`"
		},
		EFL_KEEP_ON_RECREATE_ENTITIES: {
			signature: "EFL_KEEP_ON_RECREATE_ENTITIES: int",
			description: "Value: `16`"
		},
		EFL_DIRTY_SHADOWUPDATE: {
			signature: "EFL_DIRTY_SHADOWUPDATE: int",
			description: "Value: `32`"
		},
		EFL_NOTIFY: {
			signature: "EFL_NOTIFY: int",
			description: "Value: `64`"
		},
		EFL_FORCE_CHECK_TRANSMIT: {
			signature: "EFL_FORCE_CHECK_TRANSMIT: int",
			description: "Value: `128`"
		},
		EFL_BOT_FROZEN: {
			signature: "EFL_BOT_FROZEN: int",
			description: "Value: `256`"
		},
		EFL_SERVER_ONLY: {
			signature: "EFL_SERVER_ONLY: int",
			description: "Value: `512`"
		},
		EFL_NO_AUTO_EDICT_ATTACH: {
			signature: "EFL_NO_AUTO_EDICT_ATTACH: int",
			description: "Value: `1024`"
		},
		EFL_DIRTY_ABSTRANSFORM: {
			signature: "EFL_DIRTY_ABSTRANSFORM: int",
			description: "Value: `2048`"
		},
		EFL_DIRTY_ABSVELOCITY: {
			signature: "EFL_DIRTY_ABSVELOCITY: int",
			description: "Value: `4096`"
		},
		EFL_DIRTY_ABSANGVELOCITY: {
			signature: "EFL_DIRTY_ABSANGVELOCITY: int",
			description: "Value: `8192`"
		},
		EFL_DIRTY_SURROUNDING_COLLISION_BOUNDS: {
			signature: "EFL_DIRTY_SURROUNDING_COLLISION_BOUNDS: int",
			description: "Value: `16384`"
		},
		EFL_DIRTY_SPATIAL_PARTITION: {
			signature: "EFL_DIRTY_SPATIAL_PARTITION: int",
			description: "Value: `32768`"
		},
		EFL_FORCE_ALLOW_MOVEPARENT: {
			signature: "EFL_FORCE_ALLOW_MOVEPARENT: int",
			description: "Value: `65536`"
		},
		EFL_IN_SKYBOX: {
			signature: "EFL_IN_SKYBOX: int",
			description: "Value: `131072`"
		},
		EFL_USE_PARTITION_WHEN_NOT_SOLID: {
			signature: "EFL_USE_PARTITION_WHEN_NOT_SOLID: int",
			description: "Value: `262144`"
		},
		EFL_TOUCHING_FLUID: {
			signature: "EFL_TOUCHING_FLUID: int",
			description: "Value: `524288`"
		},
		EFL_IS_BEING_LIFTED_BY_BARNACLE: {
			signature: "EFL_IS_BEING_LIFTED_BY_BARNACLE: int",
			description: "Value: `1048576`"
		},
		EFL_NO_ROTORWASH_PUSH: {
			signature: "EFL_NO_ROTORWASH_PUSH: int",
			description: "Value: `2097152`"
		},
		EFL_NO_THINK_FUNCTION: {
			signature: "EFL_NO_THINK_FUNCTION: int",
			description: "Value: `4194304`"
		},
		EFL_NO_GAME_PHYSICS_SIMULATION: {
			signature: "EFL_NO_GAME_PHYSICS_SIMULATION: int",
			description: "Value: `8388608`"
		},
		EFL_CHECK_UNTOUCH: {
			signature: "EFL_CHECK_UNTOUCH: int",
			description: "Value: `16777216`"
		},
		EFL_DONTBLOCKLOS: {
			signature: "EFL_DONTBLOCKLOS: int",
			description: "Value: `33554432`"
		},
		EFL_DONTWALKON: {
			signature: "EFL_DONTWALKON: int",
			description: "Value: `67108864`"
		},
		EFL_NO_DISSOLVE: {
			signature: "EFL_NO_DISSOLVE: int",
			description: "Value: `134217728`"
		},
		EFL_NO_MEGAPHYSCANNON_RAGDOLL: {
			signature: "EFL_NO_MEGAPHYSCANNON_RAGDOLL: int",
			description: "Value: `268435456`"
		},
		EFL_NO_WATER_VELOCITY_CHANGE: {
			signature: "EFL_NO_WATER_VELOCITY_CHANGE: int",
			description: "Value: `536870912`"
		},
		EFL_NO_PHYSCANNON_INTERACTION: {
			signature: "EFL_NO_PHYSCANNON_INTERACTION: int",
			description: "Value: `1073741824`"
		},
		EFL_NO_DAMAGE_FORCES: {
			signature: "EFL_NO_DAMAGE_FORCES: int",
			description: "Value: `2147483648`"
		}
	},
	FHideHUD: {
		HIDEHUD_WEAPONSELECTION: {
			signature: "HIDEHUD_WEAPONSELECTION: int",
			description: "Value: `1`"
		},
		HIDEHUD_FLASHLIGHT: {
			signature: "HIDEHUD_FLASHLIGHT: int",
			description: "Value: `2`"
		},
		HIDEHUD_ALL: {
			signature: "HIDEHUD_ALL: int",
			description: "Value: `4`"
		},
		HIDEHUD_HEALTH: {
			signature: "HIDEHUD_HEALTH: int",
			description: "Value: `8`"
		},
		HIDEHUD_PLAYERDEAD: {
			signature: "HIDEHUD_PLAYERDEAD: int",
			description: "Value: `16`"
		},
		HIDEHUD_BITCOUNT: {
			signature: "HIDEHUD_BITCOUNT: int",
			description: "Value: `18`"
		},
		HIDEHUD_NEEDSUIT: {
			signature: "HIDEHUD_NEEDSUIT: int",
			description: "Value: `32`"
		},
		HIDEHUD_MISCSTATUS: {
			signature: "HIDEHUD_MISCSTATUS: int",
			description: "Value: `64`"
		},
		HIDEHUD_CHAT: {
			signature: "HIDEHUD_CHAT: int",
			description: "Value: `128`"
		},
		HIDEHUD_CROSSHAIR: {
			signature: "HIDEHUD_CROSSHAIR: int",
			description: "Value: `256`"
		},
		HIDEHUD_VEHICLE_CROSSHAIR: {
			signature: "HIDEHUD_VEHICLE_CROSSHAIR: int",
			description: "Value: `512`"
		},
		HIDEHUD_INVEHICLE: {
			signature: "HIDEHUD_INVEHICLE: int",
			description: "Value: `1024`"
		},
		HIDEHUD_BONUS_PROGRESS: {
			signature: "HIDEHUD_BONUS_PROGRESS: int",
			description: "Value: `2048`"
		},
		HIDEHUD_BUILDING_STATUS: {
			signature: "HIDEHUD_BUILDING_STATUS: int",
			description: "Value: `4096`"
		},
		HIDEHUD_CLOAK_AND_FEIGN: {
			signature: "HIDEHUD_CLOAK_AND_FEIGN: int",
			description: "Value: `8192`"
		},
		HIDEHUD_PIPES_AND_CHARGE: {
			signature: "HIDEHUD_PIPES_AND_CHARGE: int",
			description: "Value: `16384`"
		},
		HIDEHUD_METAL: {
			signature: "HIDEHUD_METAL: int",
			description: "Value: `32768`"
		},
		HIDEHUD_TARGET_ID: {
			signature: "HIDEHUD_TARGET_ID: int",
			description: "Value: `65536`"
		},
		HIDEHUD_MATCH_STATUS: {
			signature: "HIDEHUD_MATCH_STATUS: int",
			description: "Value: `131072`"
		}
	},
	FNavAttributeType: {
		NAV_MESH_INVALID: {
			signature: "NAV_MESH_INVALID: int",
			description: "Value: `0`"
		},
		NAV_MESH_CROUCH: {
			signature: "NAV_MESH_CROUCH: int",
			description: "Value: `1`"
		},
		NAV_MESH_JUMP: {
			signature: "NAV_MESH_JUMP: int",
			description: "Value: `2`"
		},
		NAV_MESH_PRECISE: {
			signature: "NAV_MESH_PRECISE: int",
			description: "Value: `4`"
		},
		NAV_MESH_NO_JUMP: {
			signature: "NAV_MESH_NO_JUMP: int",
			description: "Value: `8`"
		},
		NAV_MESH_STOP: {
			signature: "NAV_MESH_STOP: int",
			description: "Value: `16`"
		},
		NAV_MESH_RUN: {
			signature: "NAV_MESH_RUN: int",
			description: "Value: `32`"
		},
		NAV_MESH_WALK: {
			signature: "NAV_MESH_WALK: int",
			description: "Value: `64`"
		},
		NAV_MESH_AVOID: {
			signature: "NAV_MESH_AVOID: int",
			description: "Value: `128`"
		},
		NAV_MESH_TRANSIENT: {
			signature: "NAV_MESH_TRANSIENT: int",
			description: "Value: `256`"
		},
		NAV_MESH_DONT_HIDE: {
			signature: "NAV_MESH_DONT_HIDE: int",
			description: "Value: `512`"
		},
		NAV_MESH_STAND: {
			signature: "NAV_MESH_STAND: int",
			description: "Value: `1024`"
		},
		NAV_MESH_NO_HOSTAGES: {
			signature: "NAV_MESH_NO_HOSTAGES: int",
			description: "Value: `2048`"
		},
		NAV_MESH_STAIRS: {
			signature: "NAV_MESH_STAIRS: int",
			description: "Value: `4096`"
		},
		NAV_MESH_NO_MERGE: {
			signature: "NAV_MESH_NO_MERGE: int",
			description: "Value: `8192`"
		},
		NAV_MESH_OBSTACLE_TOP: {
			signature: "NAV_MESH_OBSTACLE_TOP: int",
			description: "Value: `16384`"
		},
		NAV_MESH_CLIFF: {
			signature: "NAV_MESH_CLIFF: int",
			description: "Value: `32768`"
		},
		NAV_MESH_FIRST_CUSTOM: {
			signature: "NAV_MESH_FIRST_CUSTOM: int",
			description: "Value: `65536`"
		},
		NAV_MESH_LAST_CUSTOM: {
			signature: "NAV_MESH_LAST_CUSTOM: int",
			description: "Value: `67108864`"
		},
		NAV_MESH_FUNC_COST: {
			signature: "NAV_MESH_FUNC_COST: int",
			description: "Value: `536870912`"
		},
		NAV_MESH_HAS_ELEVATOR: {
			signature: "NAV_MESH_HAS_ELEVATOR: int",
			description: "Value: `1073741824`"
		},
		NAV_MESH_NAV_BLOCKER: {
			signature: "NAV_MESH_NAV_BLOCKER: int",
			description: "Value: `2147483648`"
		}
	},
	FPlayer: {
		FL_ONGROUND: {
			signature: "FL_ONGROUND: int",
			description: "Value: `1`"
		},
		FL_DUCKING: {
			signature: "FL_DUCKING: int",
			description: "Value: `2`"
		},
		FL_ANIMDUCKING: {
			signature: "FL_ANIMDUCKING: int",
			description: "Value: `4`"
		},
		FL_WATERJUMP: {
			signature: "FL_WATERJUMP: int",
			description: "Value: `8`"
		},
		PLAYER_FLAG_BITS: {
			signature: "PLAYER_FLAG_BITS: int",
			description: "Value: `11`"
		},
		FL_ONTRAIN: {
			signature: "FL_ONTRAIN: int",
			description: "Value: `16`"
		},
		FL_INRAIN: {
			signature: "FL_INRAIN: int",
			description: "Value: `32`"
		},
		FL_FROZEN: {
			signature: "FL_FROZEN: int",
			description: "Value: `64`"
		},
		FL_ATCONTROLS: {
			signature: "FL_ATCONTROLS: int",
			description: "Value: `128`"
		},
		FL_CLIENT: {
			signature: "FL_CLIENT: int",
			description: "Value: `256`"
		},
		FL_FAKECLIENT: {
			signature: "FL_FAKECLIENT: int",
			description: "Value: `512`"
		},
		FL_INWATER: {
			signature: "FL_INWATER: int",
			description: "Value: `1024`"
		},
		FL_FLY: {
			signature: "FL_FLY: int",
			description: "Value: `2048`"
		},
		FL_SWIM: {
			signature: "FL_SWIM: int",
			description: "Value: `4096`"
		},
		FL_CONVEYOR: {
			signature: "FL_CONVEYOR: int",
			description: "Value: `8192`"
		},
		FL_NPC: {
			signature: "FL_NPC: int",
			description: "Value: `16384`"
		},
		FL_GODMODE: {
			signature: "FL_GODMODE: int",
			description: "Value: `32768`"
		},
		FL_NOTARGET: {
			signature: "FL_NOTARGET: int",
			description: "Value: `65536`"
		},
		FL_AIMTARGET: {
			signature: "FL_AIMTARGET: int",
			description: "Value: `131072`"
		},
		FL_PARTIALGROUND: {
			signature: "FL_PARTIALGROUND: int",
			description: "Value: `262144`"
		},
		FL_STATICPROP: {
			signature: "FL_STATICPROP: int",
			description: "Value: `524288`"
		},
		FL_GRAPHED: {
			signature: "FL_GRAPHED: int",
			description: "Value: `1048576`"
		},
		FL_GRENADE: {
			signature: "FL_GRENADE: int",
			description: "Value: `2097152`"
		},
		FL_STEPMOVEMENT: {
			signature: "FL_STEPMOVEMENT: int",
			description: "Value: `4194304`"
		},
		FL_DONTTOUCH: {
			signature: "FL_DONTTOUCH: int",
			description: "Value: `8388608`"
		},
		FL_BASEVELOCITY: {
			signature: "FL_BASEVELOCITY: int",
			description: "Value: `16777216`"
		},
		FL_WORLDBRUSH: {
			signature: "FL_WORLDBRUSH: int",
			description: "Value: `33554432`"
		},
		FL_OBJECT: {
			signature: "FL_OBJECT: int",
			description: "Value: `67108864`"
		},
		FL_KILLME: {
			signature: "FL_KILLME: int",
			description: "Value: `134217728`"
		},
		FL_ONFIRE: {
			signature: "FL_ONFIRE: int",
			description: "Value: `268435456`"
		},
		FL_DISSOLVING: {
			signature: "FL_DISSOLVING: int",
			description: "Value: `536870912`"
		},
		FL_TRANSRAGDOLL: {
			signature: "FL_TRANSRAGDOLL: int",
			description: "Value: `1073741824`"
		},
		FL_UNBLOCKABLE_BY_PLAYER: {
			signature: "FL_UNBLOCKABLE_BY_PLAYER: int",
			description: "Value: `2147483648`"
		}
	},
	FSolid: {
		FSOLID_CUSTOMRAYTEST: {
			signature: "FSOLID_CUSTOMRAYTEST: int",
			description: "Value: `1`"
		},
		FSOLID_CUSTOMBOXTEST: {
			signature: "FSOLID_CUSTOMBOXTEST: int",
			description: "Value: `2`"
		},
		FSOLID_NOT_SOLID: {
			signature: "FSOLID_NOT_SOLID: int",
			description: "Value: `4`"
		},
		FSOLID_TRIGGER: {
			signature: "FSOLID_TRIGGER: int",
			description: "Value: `8`"
		},
		FSOLID_MAX_BITS: {
			signature: "FSOLID_MAX_BITS: int",
			description: "Value: `10`"
		},
		FSOLID_NOT_STANDABLE: {
			signature: "FSOLID_NOT_STANDABLE: int",
			description: "Value: `16`"
		},
		FSOLID_VOLUME_CONTENTS: {
			signature: "FSOLID_VOLUME_CONTENTS: int",
			description: "Value: `32`"
		},
		FSOLID_FORCE_WORLD_ALIGNED: {
			signature: "FSOLID_FORCE_WORLD_ALIGNED: int",
			description: "Value: `64`"
		},
		FSOLID_USE_TRIGGER_BOUNDS: {
			signature: "FSOLID_USE_TRIGGER_BOUNDS: int",
			description: "Value: `128`"
		},
		FSOLID_ROOT_PARENT_ALIGNED: {
			signature: "FSOLID_ROOT_PARENT_ALIGNED: int",
			description: "Value: `256`"
		},
		FSOLID_TRIGGER_TOUCH_DEBRIS: {
			signature: "FSOLID_TRIGGER_TOUCH_DEBRIS: int",
			description: "Value: `512`"
		}
	},
	FSurf: {
		SURF_LIGHT: {
			signature: "SURF_LIGHT: int",
			description: "Value: `1`"
		},
		SURF_SKY2D: {
			signature: "SURF_SKY2D: int",
			description: "Value: `2`"
		},
		SURF_SKY: {
			signature: "SURF_SKY: int",
			description: "Value: `4`"
		},
		SURF_WARP: {
			signature: "SURF_WARP: int",
			description: "Value: `8`"
		},
		SURF_TRANS: {
			signature: "SURF_TRANS: int",
			description: "Value: `16`"
		},
		SURF_NOPORTAL: {
			signature: "SURF_NOPORTAL: int",
			description: "Value: `32`"
		},
		SURF_TRIGGER: {
			signature: "SURF_TRIGGER: int",
			description: "Value: `64`"
		},
		SURF_NODRAW: {
			signature: "SURF_NODRAW: int",
			description: "Value: `128`"
		},
		SURF_HINT: {
			signature: "SURF_HINT: int",
			description: "Value: `256`"
		},
		SURF_SKIP: {
			signature: "SURF_SKIP: int",
			description: "Value: `512`"
		},
		SURF_NOLIGHT: {
			signature: "SURF_NOLIGHT: int",
			description: "Value: `1024`"
		},
		SURF_BUMPLIGHT: {
			signature: "SURF_BUMPLIGHT: int",
			description: "Value: `2048`"
		},
		SURF_NOSHADOWS: {
			signature: "SURF_NOSHADOWS: int",
			description: "Value: `4096`"
		},
		SURF_NODECALS: {
			signature: "SURF_NODECALS: int",
			description: "Value: `8192`"
		},
		SURF_NOCHOP: {
			signature: "SURF_NOCHOP: int",
			description: "Value: `16384`"
		},
		SURF_HITBOX: {
			signature: "SURF_HITBOX: int",
			description: "Value: `32768`"
		}
	},
	FTaunts: {
		TAUNT_BASE_WEAPON: {
			signature: "TAUNT_BASE_WEAPON: int",
			description: "Value: `0`"
		},
		TAUNT_MISC_ITEM: {
			signature: "TAUNT_MISC_ITEM: int",
			description: "Value: `1`"
		},
		TAUNT_SHOW_ITEM: {
			signature: "TAUNT_SHOW_ITEM: int",
			description: "Value: `2`"
		},
		TAUNT_LONG: {
			signature: "TAUNT_LONG: int",
			description: "Value: `3`"
		},
		TAUNT_SPECIAL: {
			signature: "TAUNT_SPECIAL: int",
			description: "Value: `4`"
		}
	},
	FTFBotAttributeType: {
		REMOVE_ON_DEATH: {
			signature: "REMOVE_ON_DEATH: int",
			description: "Value: `1`"
		},
		AGGRESSIVE: {
			signature: "AGGRESSIVE: int",
			description: "Value: `2`"
		},
		IS_NPC: {
			signature: "IS_NPC: int",
			description: "Value: `4`"
		},
		SUPPRESS_FIRE: {
			signature: "SUPPRESS_FIRE: int",
			description: "Value: `8`"
		},
		DISABLE_DODGE: {
			signature: "DISABLE_DODGE: int",
			description: "Value: `16`"
		},
		BECOME_SPECTATOR_ON_DEATH: {
			signature: "BECOME_SPECTATOR_ON_DEATH: int",
			description: "Value: `32`"
		},
		QUOTA_MANANGED: {
			signature: "QUOTA_MANANGED: int",
			description: "Value: `64`"
		},
		RETAIN_BUILDINGS: {
			signature: "RETAIN_BUILDINGS: int",
			description: "Value: `128`"
		},
		SPAWN_WITH_FULL_CHARGE: {
			signature: "SPAWN_WITH_FULL_CHARGE: int",
			description: "Value: `256`"
		},
		ALWAYS_CRIT: {
			signature: "ALWAYS_CRIT: int",
			description: "Value: `512`"
		},
		IGNORE_ENEMIES: {
			signature: "IGNORE_ENEMIES: int",
			description: "Value: `1024`"
		},
		HOLD_FIRE_UNTIL_FULL_RELOAD: {
			signature: "HOLD_FIRE_UNTIL_FULL_RELOAD: int",
			description: "Value: `2048`"
		},
		PRIORITIZE_DEFENSE: {
			signature: "PRIORITIZE_DEFENSE: int",
			description: "Value: `4096`"
		},
		ALWAYS_FIRE_WEAPON: {
			signature: "ALWAYS_FIRE_WEAPON: int",
			description: "Value: `8192`"
		},
		TELEPORT_TO_HINT: {
			signature: "TELEPORT_TO_HINT: int",
			description: "Value: `16384`"
		},
		MINIBOSS: {
			signature: "MINIBOSS: int",
			description: "Value: `32768`"
		},
		USE_BOSS_HEALTH_BAR: {
			signature: "USE_BOSS_HEALTH_BAR: int",
			description: "Value: `65536`"
		},
		IGNORE_FLAG: {
			signature: "IGNORE_FLAG: int",
			description: "Value: `131072`"
		},
		AUTO_JUMP: {
			signature: "AUTO_JUMP: int",
			description: "Value: `262144`"
		},
		AIR_CHARGE_ONLY: {
			signature: "AIR_CHARGE_ONLY: int",
			description: "Value: `524288`"
		},
		PREFER_VACCINATOR_BULLETS: {
			signature: "PREFER_VACCINATOR_BULLETS: int",
			description: "Value: `1048576`"
		},
		PREFER_VACCINATOR_BLAST: {
			signature: "PREFER_VACCINATOR_BLAST: int",
			description: "Value: `2097152`"
		},
		PREFER_VACCINATOR_FIRE: {
			signature: "PREFER_VACCINATOR_FIRE: int",
			description: "Value: `4194304`"
		},
		BULLET_IMMUNE: {
			signature: "BULLET_IMMUNE: int",
			description: "Value: `8388608`"
		},
		BLAST_IMMUNE: {
			signature: "BLAST_IMMUNE: int",
			description: "Value: `16777216`"
		},
		FIRE_IMMUNE: {
			signature: "FIRE_IMMUNE: int",
			description: "Value: `33554432`"
		},
		PARACHUTE: {
			signature: "PARACHUTE: int",
			description: "Value: `67108864`"
		},
		PROJECTILE_SHIELD: {
			signature: "PROJECTILE_SHIELD: int",
			description: "Value: `134217728`"
		}
	},
	FTFNavAttributeType: {
		TF_NAV_INVALID: {
			signature: "TF_NAV_INVALID: int",
			description: "Value: `0`"
		},
		TF_NAV_BLOCKED: {
			signature: "TF_NAV_BLOCKED: int",
			description: "Value: `1`"
		},
		TF_NAV_SPAWN_ROOM_RED: {
			signature: "TF_NAV_SPAWN_ROOM_RED: int",
			description: "Value: `2`"
		},
		TF_NAV_SPAWN_ROOM_BLUE: {
			signature: "TF_NAV_SPAWN_ROOM_BLUE: int",
			description: "Value: `4`"
		},
		TF_NAV_SPAWN_ROOM_EXIT: {
			signature: "TF_NAV_SPAWN_ROOM_EXIT: int",
			description: "Value: `8`"
		},
		TF_NAV_HAS_AMMO: {
			signature: "TF_NAV_HAS_AMMO: int",
			description: "Value: `16`"
		},
		TF_NAV_HAS_HEALTH: {
			signature: "TF_NAV_HAS_HEALTH: int",
			description: "Value: `32`"
		},
		TF_NAV_CONTROL_POINT: {
			signature: "TF_NAV_CONTROL_POINT: int",
			description: "Value: `64`"
		},
		TF_NAV_BLUE_SENTRY_DANGER: {
			signature: "TF_NAV_BLUE_SENTRY_DANGER: int",
			description: "Value: `128`"
		},
		TF_NAV_RED_SENTRY_DANGER: {
			signature: "TF_NAV_RED_SENTRY_DANGER: int",
			description: "Value: `256`"
		},
		TF_NAV_BLUE_SETUP_GATE: {
			signature: "TF_NAV_BLUE_SETUP_GATE: int",
			description: "Value: `2048`"
		},
		TF_NAV_RED_SETUP_GATE: {
			signature: "TF_NAV_RED_SETUP_GATE: int",
			description: "Value: `4096`"
		},
		TF_NAV_BLOCKED_AFTER_POINT_CAPTURE: {
			signature: "TF_NAV_BLOCKED_AFTER_POINT_CAPTURE: int",
			description: "Value: `8192`"
		},
		TF_NAV_BLOCKED_UNTIL_POINT_CAPTURE: {
			signature: "TF_NAV_BLOCKED_UNTIL_POINT_CAPTURE: int",
			description: "Value: `16384`"
		},
		TF_NAV_BLUE_ONE_WAY_DOOR: {
			signature: "TF_NAV_BLUE_ONE_WAY_DOOR: int",
			description: "Value: `32768`"
		},
		TF_NAV_RED_ONE_WAY_DOOR: {
			signature: "TF_NAV_RED_ONE_WAY_DOOR: int",
			description: "Value: `65536`"
		},
		TF_NAV_WITH_SECOND_POINT: {
			signature: "TF_NAV_WITH_SECOND_POINT: int",
			description: "Value: `131072`"
		},
		TF_NAV_WITH_THIRD_POINT: {
			signature: "TF_NAV_WITH_THIRD_POINT: int",
			description: "Value: `262144`"
		},
		TF_NAV_WITH_FOURTH_POINT: {
			signature: "TF_NAV_WITH_FOURTH_POINT: int",
			description: "Value: `524288`"
		},
		TF_NAV_WITH_FIFTH_POINT: {
			signature: "TF_NAV_WITH_FIFTH_POINT: int",
			description: "Value: `1048576`"
		},
		TF_NAV_SNIPER_SPOT: {
			signature: "TF_NAV_SNIPER_SPOT: int",
			description: "Value: `2097152`"
		},
		TF_NAV_SENTRY_SPOT: {
			signature: "TF_NAV_SENTRY_SPOT: int",
			description: "Value: `4194304`"
		},
		TF_NAV_ESCAPE_ROUTE: {
			signature: "TF_NAV_ESCAPE_ROUTE: int",
			description: "Value: `8388608`"
		},
		TF_NAV_ESCAPE_ROUTE_VISIBLE: {
			signature: "TF_NAV_ESCAPE_ROUTE_VISIBLE: int",
			description: "Value: `16777216`"
		},
		TF_NAV_NO_SPAWNING: {
			signature: "TF_NAV_NO_SPAWNING: int",
			description: "Value: `33554432`"
		},
		TF_NAV_RESCUE_CLOSET: {
			signature: "TF_NAV_RESCUE_CLOSET: int",
			description: "Value: `67108864`"
		},
		TF_NAV_BOMB_CAN_DROP_HERE: {
			signature: "TF_NAV_BOMB_CAN_DROP_HERE: int",
			description: "Value: `134217728`"
		},
		TF_NAV_DOOR_NEVER_BLOCKS: {
			signature: "TF_NAV_DOOR_NEVER_BLOCKS: int",
			description: "Value: `268435456`"
		},
		TF_NAV_DOOR_ALWAYS_BLOCKS: {
			signature: "TF_NAV_DOOR_ALWAYS_BLOCKS: int",
			description: "Value: `536870912`"
		},
		TF_NAV_UNBLOCKABLE: {
			signature: "TF_NAV_UNBLOCKABLE: int",
			description: "Value: `1073741824`"
		},
		TF_NAV_PERSISTENT_ATTRIBUTES: {
			signature: "TF_NAV_PERSISTENT_ATTRIBUTES: int",
			description: "Value: `1988098048`"
		}
	}
}

export const gameEvents: Docs = {

}