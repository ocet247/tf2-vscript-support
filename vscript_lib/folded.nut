// Folded Constants, can be achieved by running the following:
local CONST = getconsttable()
local ROOT = getroottable()
if (!("ConstantNamingConvention" in ROOT)) // make sure folding is only done once
{
	foreach (enum_table in Constants)
	{
		foreach (name, value in enum_table)
		{
			if (value == null)
				value = 0

			CONST[name] <- value
			ROOT[name] <- value
		}
	}
}
const TF_BOT_TYPE = 1337

const COLLISION_GROUP_NONE = 0
const COLLISION_GROUP_DEBRIS = 1
const COLLISION_GROUP_DEBRIS_TRIGGER = 2
const COLLISION_GROUP_INTERACTIVE_DEBRIS = 3
const COLLISION_GROUP_INTERACTIVE = 4
const COLLISION_GROUP_PLAYER = 5
const COLLISION_GROUP_BREAKABLE_GLASS = 6
const COLLISION_GROUP_VEHICLE = 7
const COLLISION_GROUP_PLAYER_MOVEMENT = 8
const COLLISION_GROUP_NPC = 9
const COLLISION_GROUP_IN_VEHICLE = 10
const COLLISION_GROUP_WEAPON = 11
const COLLISION_GROUP_VEHICLE_CLIP = 12
const COLLISION_GROUP_PROJECTILE = 13
const COLLISION_GROUP_DOOR_BLOCKER = 14
const COLLISION_GROUP_PASSABLE_DOOR = 15
const COLLISION_GROUP_DISSOLVING = 16
const COLLISION_GROUP_PUSHAWAY = 17
const COLLISION_GROUP_NPC_ACTOR = 18
const COLLISION_GROUP_NPC_SCRIPTED = 19
const LAST_SHARED_COLLISION_GROUP = 20

const CRIT_NONE = 0
const CRIT_MINI = 1
const CRIT_FULL = 2

const HITGROUP_GENERIC = 0
const HITGROUP_HEAD = 1
const HITGROUP_CHEST = 2
const HITGROUP_STOMACH = 3
const HITGROUP_LEFTARM = 4
const HITGROUP_RIGHTARM = 5
const HITGROUP_LEFTLEG = 6
const HITGROUP_RIGHTLEG = 7
const HITGROUP_GEAR = 10

const kHoliday_None = 0
const kHoliday_TFBirthday = 1
const kHoliday_Halloween = 2
const kHoliday_Christmas = 3
const kHoliday_CommunityUpdate = 4
const kHoliday_EOTL = 5
const kHoliday_Valentines = 6
const kHoliday_MeetThePyro = 7
const kHoliday_FullMoon = 8
const kHoliday_HalloweenOrFullMoon = 9
const kHoliday_HalloweenOrFullMoonOrValentines = 10
const kHoliday_AprilFools = 11
const kHoliday_Soldier = 12
const kHoliday_Summer = 13
const kHolidayCount = 14

const HUD_PRINTNOTIFY = 1
const HUD_PRINTCONSOLE = 2
const HUD_PRINTTALK = 3
const HUD_PRINTCENTER = 4

const MOVECOLLIDE_DEFAULT = 0
const MOVECOLLIDE_FLY_BOUNCE = 1
const MOVECOLLIDE_FLY_CUSTOM = 2
const MOVECOLLIDE_FLY_SLIDE = 3
const MOVECOLLIDE_MAX_BITS = 3
const MOVECOLLIDE_COUNT = 4

const MOVETYPE_NONE = 0
const MOVETYPE_ISOMETRIC = 1
const MOVETYPE_WALK = 2
const MOVETYPE_STEP = 3
const MOVETYPE_FLY = 4
const MOVETYPE_FLYGRAVITY = 5
const MOVETYPE_VPHYSICS = 6
const MOVETYPE_PUSH = 7
const MOVETYPE_NOCLIP = 8
const MOVETYPE_LADDER = 9
const MOVETYPE_OBSERVER = 10
const MOVETYPE_CUSTOM = 11
const MOVETYPE_LAST = 11

const NORTH_WEST = 0
const NORTH_EAST = 1
const SOUTH_EAST = 2
const SOUTH_WEST = 3
const NUM_CORNERS = 4

const NORTH = 0
const EAST = 1
const SOUTH = 2
const WEST = 3
const NUM_DIRECTIONS = 4

const FORWARD = 0
const RIGHT = 1
const BACKWARD = 2
const LEFT = 3
const UP = 4
const DOWN = 5
const NUM_RELATIVE_DIRECTIONS = 6

const GO_NORTH = 0
const GO_EAST = 1
const GO_SOUTH = 2
const GO_WEST = 3
const GO_LADDER_UP = 4
const GO_LADDER_DOWN = 5
const GO_JUMP = 6
const GO_ELEVATOR_UP = 7
const GO_ELEVATOR_DOWN = 8
const NUM_TRAVERSE_TYPES = 9

const kRenderFxNone = 0
const kRenderFxPulseSlow = 1
const kRenderFxPulseFast = 2
const kRenderFxPulseSlowWide = 3
const kRenderFxPulseFastWide = 4
const kRenderFxFadeSlow = 5
const kRenderFxFadeFast = 6
const kRenderFxSolidSlow = 7
const kRenderFxSolidFast = 8
const kRenderFxStrobeSlow = 9
const kRenderFxStrobeFast = 10
const kRenderFxStrobeFaster = 11
const kRenderFxFlickerSlow = 12
const kRenderFxFlickerFast = 13
const kRenderFxNoDissipation = 14
const kRenderFxDistort = 15
const kRenderFxHologram = 16
const kRenderFxExplode = 17
const kRenderFxGlowShell = 18
const kRenderFxClampMinScale = 19
const kRenderFxEnvRain = 20
const kRenderFxEnvSnow = 21
const kRenderFxSpotlight = 22
const kRenderFxRagdoll = 23
const kRenderFxPulseFastWider = 24
const kRenderFxMax = 25

const kRenderNormal = 0
const kRenderTransColor = 1
const kRenderTransTexture = 2
const kRenderGlow = 3
const kRenderTransAlpha = 4
const kRenderTransAdd = 5
const kRenderEnvironmental = 6
const kRenderTransAddFrameBlend = 7
const kRenderTransAlphaAdd = 8
const kRenderWorldGlow = 9
const kRenderNone = 10
const kRenderModeCount = 11

const GR_STATE_INIT = 0
const GR_STATE_PREGAME = 1
const GR_STATE_STARTGAME = 2
const GR_STATE_PREROUND = 3
const GR_STATE_RND_RUNNING = 4
const GR_STATE_TEAM_WIN = 5
const GR_STATE_RESTART = 6
const GR_STATE_STALEMATE = 7
const GR_STATE_GAME_OVER = 8
const GR_NUM_ROUND_STATES = 11

const RECIPIENT_FILTER_DEFAULT = 0
const RECIPIENT_FILTER_PAS_ATTENUATION = 1
const RECIPIENT_FILTER_PAS = 2
const RECIPIENT_FILTER_PVS = 3
const RECIPIENT_FILTER_SINGLE_PLAYER = 4
const RECIPIENT_FILTER_GLOBAL = 5
const RECIPIENT_FILTER_TEAM = 6

const SOLID_NONE = 0
const SOLID_BSP = 1
const SOLID_BBOX = 2
const SOLID_OBB = 3
const SOLID_OBB_YAW = 4
const SOLID_CUSTOM = 5
const SOLID_VPHYSICS = 6
const SOLID_LAST = 7

const OBS_MODE_NONE = 0
const OBS_MODE_DEATHCAM = 1
const OBS_MODE_FREEZECAM = 2
const OBS_MODE_FIXED = 3
const OBS_MODE_IN_EYE = 4
const OBS_MODE_CHASE = 5
const OBS_MODE_POI = 6
const OBS_MODE_ROAMING = 7
const NUM_OBSERVER_MODES = 8

const STOPWATCH_CAPTURE_TIME_NOT_SET = 0
const STOPWATCH_RUNNING = 1
const STOPWATCH_OVERTIME = 2

const EASY = 0
const NORMAL = 1
const HARD = 2
const EXPERT = 3
const NUM_DIFFICULTY_LEVELS = 4
const UNDEFINED = -1

const TF_CLASS_UNDEFINED = 0
const TF_CLASS_SCOUT = 1
const TF_CLASS_SNIPER = 2
const TF_CLASS_SOLDIER = 3
const TF_CLASS_DEMOMAN = 4
const TF_CLASS_MEDIC = 5
const TF_CLASS_HEAVYWEAPONS = 6
const TF_CLASS_PYRO = 7
const TF_CLASS_SPY = 8
const TF_CLASS_ENGINEER = 9
const TF_CLASS_CIVILIAN = 10
const TF_CLASS_COUNT_ALL = 11
const TF_CLASS_RANDOM = 12

const TF_COND_AIMING = 0
const TF_COND_ZOOMED = 1
const TF_COND_DISGUISING = 2
const TF_COND_DISGUISED = 3
const TF_COND_STEALTHED = 4
const TF_COND_INVULNERABLE = 5
const TF_COND_TELEPORTED = 6
const TF_COND_TAUNTING = 7
const TF_COND_INVULNERABLE_WEARINGOFF = 8
const TF_COND_STEALTHED_BLINK = 9
const TF_COND_SELECTED_TO_TELEPORT = 10
const TF_COND_CRITBOOSTED = 11
const TF_COND_TMPDAMAGEBONUS = 12
const TF_COND_FEIGN_DEATH = 13
const TF_COND_PHASE = 14
const TF_COND_STUNNED = 15
const TF_COND_OFFENSEBUFF = 16
const TF_COND_SHIELD_CHARGE = 17
const TF_COND_DEMO_BUFF = 18
const TF_COND_ENERGY_BUFF = 19
const TF_COND_RADIUSHEAL = 20
const TF_COND_HEALTH_BUFF = 21
const TF_COND_BURNING = 22
const TF_COND_HEALTH_OVERHEALED = 23
const TF_COND_URINE = 24
const TF_COND_BLEEDING = 25
const TF_COND_DEFENSEBUFF = 26
const TF_COND_MAD_MILK = 27
const TF_COND_MEGAHEAL = 28
const TF_COND_REGENONDAMAGEBUFF = 29
const TF_COND_MARKEDFORDEATH = 30
const TF_COND_NOHEALINGDAMAGEBUFF = 31
const TF_COND_SPEED_BOOST = 32
const TF_COND_CRITBOOSTED_PUMPKIN = 33
const TF_COND_CRITBOOSTED_USER_BUFF = 34
const TF_COND_CRITBOOSTED_DEMO_CHARGE = 35
const TF_COND_SODAPOPPER_HYPE = 36
const TF_COND_CRITBOOSTED_FIRST_BLOOD = 37
const TF_COND_CRITBOOSTED_BONUS_TIME = 38
const TF_COND_CRITBOOSTED_CTF_CAPTURE = 39
const TF_COND_CRITBOOSTED_ON_KILL = 40
const TF_COND_CANNOT_SWITCH_FROM_MELEE = 41
const TF_COND_DEFENSEBUFF_NO_CRIT_BLOCK = 42
const TF_COND_REPROGRAMMED = 43
const TF_COND_CRITBOOSTED_RAGE_BUFF = 44
const TF_COND_DEFENSEBUFF_HIGH = 45
const TF_COND_SNIPERCHARGE_RAGE_BUFF = 46
const TF_COND_DISGUISE_WEARINGOFF = 47
const TF_COND_MARKEDFORDEATH_SILENT = 48
const TF_COND_DISGUISED_AS_DISPENSER = 49
const TF_COND_SAPPED = 50
const TF_COND_INVULNERABLE_HIDE_UNLESS_DAMAGED = 51
const TF_COND_INVULNERABLE_USER_BUFF = 52
const TF_COND_HALLOWEEN_BOMB_HEAD = 53
const TF_COND_HALLOWEEN_THRILLER = 54
const TF_COND_RADIUSHEAL_ON_DAMAGE = 55
const TF_COND_CRITBOOSTED_CARD_EFFECT = 56
const TF_COND_INVULNERABLE_CARD_EFFECT = 57
const TF_COND_MEDIGUN_UBER_BULLET_RESIST = 58
const TF_COND_MEDIGUN_UBER_BLAST_RESIST = 59
const TF_COND_MEDIGUN_UBER_FIRE_RESIST = 60
const TF_COND_MEDIGUN_SMALL_BULLET_RESIST = 61
const TF_COND_MEDIGUN_SMALL_BLAST_RESIST = 62
const TF_COND_MEDIGUN_SMALL_FIRE_RESIST = 63
const TF_COND_STEALTHED_USER_BUFF = 64
const TF_COND_MEDIGUN_DEBUFF = 65
const TF_COND_STEALTHED_USER_BUFF_FADING = 66
const TF_COND_BULLET_IMMUNE = 67
const TF_COND_BLAST_IMMUNE = 68
const TF_COND_FIRE_IMMUNE = 69
const TF_COND_PREVENT_DEATH = 70
const TF_COND_MVM_BOT_STUN_RADIOWAVE = 71
const TF_COND_HALLOWEEN_SPEED_BOOST = 72
const TF_COND_HALLOWEEN_QUICK_HEAL = 73
const TF_COND_HALLOWEEN_GIANT = 74
const TF_COND_HALLOWEEN_TINY = 75
const TF_COND_HALLOWEEN_IN_HELL = 76
const TF_COND_HALLOWEEN_GHOST_MODE = 77
const TF_COND_MINICRITBOOSTED_ON_KILL = 78
const TF_COND_OBSCURED_SMOKE = 79
const TF_COND_PARACHUTE_ACTIVE = 80
const TF_COND_BLASTJUMPING = 81
const TF_COND_HALLOWEEN_KART = 82
const TF_COND_HALLOWEEN_KART_DASH = 83
const TF_COND_BALLOON_HEAD = 84
const TF_COND_MELEE_ONLY = 85
const TF_COND_SWIMMING_CURSE = 86
const TF_COND_FREEZE_INPUT = 87
const TF_COND_HALLOWEEN_KART_CAGE = 88
const TF_COND_DONOTUSE_0 = 89
const TF_COND_RUNE_STRENGTH = 90
const TF_COND_RUNE_HASTE = 91
const TF_COND_RUNE_REGEN = 92
const TF_COND_RUNE_RESIST = 93
const TF_COND_RUNE_VAMPIRE = 94
const TF_COND_RUNE_REFLECT = 95
const TF_COND_RUNE_PRECISION = 96
const TF_COND_RUNE_AGILITY = 97
const TF_COND_GRAPPLINGHOOK = 98
const TF_COND_GRAPPLINGHOOK_SAFEFALL = 99
const TF_COND_GRAPPLINGHOOK_LATCHED = 100
const TF_COND_GRAPPLINGHOOK_BLEEDING = 101
const TF_COND_AFTERBURN_IMMUNE = 102
const TF_COND_RUNE_KNOCKOUT = 103
const TF_COND_RUNE_IMBALANCE = 104
const TF_COND_CRITBOOSTED_RUNE_TEMP = 105
const TF_COND_PASSTIME_INTERCEPTION = 106
const TF_COND_SWIMMING_NO_EFFECTS = 107
const TF_COND_PURGATORY = 108
const TF_COND_RUNE_KING = 109
const TF_COND_RUNE_PLAGUE = 110
const TF_COND_RUNE_SUPERNOVA = 111
const TF_COND_PLAGUE = 112
const TF_COND_KING_BUFFED = 113
const TF_COND_TEAM_GLOWS = 114
const TF_COND_KNOCKED_INTO_AIR = 115
const TF_COND_COMPETITIVE_WINNER = 116
const TF_COND_COMPETITIVE_LOSER = 117
const TF_COND_HEALING_DEBUFF = 118
const TF_COND_PASSTIME_PENALTY_DEBUFF = 119
const TF_COND_GRAPPLED_TO_PLAYER = 120
const TF_COND_GRAPPLED_BY_PLAYER = 121
const TF_COND_PARACHUTE_DEPLOYED = 122
const TF_COND_GAS = 123
const TF_COND_BURNING_PYRO = 124
const TF_COND_ROCKETPACK = 125
const TF_COND_LOST_FOOTING = 126
const TF_COND_AIR_CURRENT = 127
const TF_COND_HALLOWEEN_HELL_HEAL = 128
const TF_COND_POWERUPMODE_DOMINANT = 129
const TF_COND_IMMUNE_TO_PUSHBACK = 130
const TF_COND_INVALID = -1

const TF_DMG_CUSTOM_NONE = 0
const TF_DMG_CUSTOM_HEADSHOT = 1
const TF_DMG_CUSTOM_BACKSTAB = 2
const TF_DMG_CUSTOM_BURNING = 3
const TF_DMG_WRENCH_FIX = 4
const TF_DMG_CUSTOM_MINIGUN = 5
const TF_DMG_CUSTOM_SUICIDE = 6
const TF_DMG_CUSTOM_TAUNTATK_HADOUKEN = 7
const TF_DMG_CUSTOM_BURNING_FLARE = 8
const TF_DMG_CUSTOM_TAUNTATK_HIGH_NOON = 9
const TF_DMG_CUSTOM_TAUNTATK_GRAND_SLAM = 10
const TF_DMG_CUSTOM_PENETRATE_MY_TEAM = 11
const TF_DMG_CUSTOM_PENETRATE_ALL_PLAYERS = 12
const TF_DMG_CUSTOM_TAUNTATK_FENCING = 13
const TF_DMG_CUSTOM_PENETRATE_NONBURNING_TEAMMATE = 14
const TF_DMG_CUSTOM_TAUNTATK_ARROW_STAB = 15
const TF_DMG_CUSTOM_TELEFRAG = 16
const TF_DMG_CUSTOM_BURNING_ARROW = 17
const TF_DMG_CUSTOM_FLYINGBURN = 18
const TF_DMG_CUSTOM_PUMPKIN_BOMB = 19
const TF_DMG_CUSTOM_DECAPITATION = 20
const TF_DMG_CUSTOM_TAUNTATK_GRENADE = 21
const TF_DMG_CUSTOM_BASEBALL = 22
const TF_DMG_CUSTOM_CHARGE_IMPACT = 23
const TF_DMG_CUSTOM_TAUNTATK_BARBARIAN_SWING = 24
const TF_DMG_CUSTOM_AIR_STICKY_BURST = 25
const TF_DMG_CUSTOM_DEFENSIVE_STICKY = 26
const TF_DMG_CUSTOM_PICKAXE = 27
const TF_DMG_CUSTOM_ROCKET_DIRECTHIT = 28
const TF_DMG_CUSTOM_TAUNTATK_UBERSLICE = 29
const TF_DMG_CUSTOM_PLAYER_SENTRY = 30
const TF_DMG_CUSTOM_STANDARD_STICKY = 31
const TF_DMG_CUSTOM_SHOTGUN_REVENGE_CRIT = 32
const TF_DMG_CUSTOM_TAUNTATK_ENGINEER_GUITAR_SMASH = 33
const TF_DMG_CUSTOM_BLEEDING = 34
const TF_DMG_CUSTOM_GOLD_WRENCH = 35
const TF_DMG_CUSTOM_CARRIED_BUILDING = 36
const TF_DMG_CUSTOM_COMBO_PUNCH = 37
const TF_DMG_CUSTOM_TAUNTATK_ENGINEER_ARM_KILL = 38
const TF_DMG_CUSTOM_FISH_KILL = 39
const TF_DMG_CUSTOM_TRIGGER_HURT = 40
const TF_DMG_CUSTOM_DECAPITATION_BOSS = 41
const TF_DMG_CUSTOM_STICKBOMB_EXPLOSION = 42
const TF_DMG_CUSTOM_AEGIS_ROUND = 43
const TF_DMG_CUSTOM_FLARE_EXPLOSION = 44
const TF_DMG_CUSTOM_BOOTS_STOMP = 45
const TF_DMG_CUSTOM_PLASMA = 46
const TF_DMG_CUSTOM_PLASMA_CHARGED = 47
const TF_DMG_CUSTOM_PLASMA_GIB = 48
const TF_DMG_CUSTOM_PRACTICE_STICKY = 49
const TF_DMG_CUSTOM_EYEBALL_ROCKET = 50
const TF_DMG_CUSTOM_HEADSHOT_DECAPITATION = 51
const TF_DMG_CUSTOM_TAUNTATK_ARMAGEDDON = 52
const TF_DMG_CUSTOM_FLARE_PELLET = 53
const TF_DMG_CUSTOM_CLEAVER = 54
const TF_DMG_CUSTOM_CLEAVER_CRIT = 55
const TF_DMG_CUSTOM_SAPPER_RECORDER_DEATH = 56
const TF_DMG_CUSTOM_MERASMUS_PLAYER_BOMB = 57
const TF_DMG_CUSTOM_MERASMUS_GRENADE = 58
const TF_DMG_CUSTOM_MERASMUS_ZAP = 59
const TF_DMG_CUSTOM_MERASMUS_DECAPITATION = 60
const TF_DMG_CUSTOM_CANNONBALL_PUSH = 61
const TF_DMG_CUSTOM_TAUNTATK_ALLCLASS_GUITAR_RIFF = 62
const TF_DMG_CUSTOM_THROWABLE = 63
const TF_DMG_CUSTOM_THROWABLE_KILL = 64
const TF_DMG_CUSTOM_SPELL_TELEPORT = 65
const TF_DMG_CUSTOM_SPELL_SKELETON = 66
const TF_DMG_CUSTOM_SPELL_MIRV = 67
const TF_DMG_CUSTOM_SPELL_METEOR = 68
const TF_DMG_CUSTOM_SPELL_LIGHTNING = 69
const TF_DMG_CUSTOM_SPELL_FIREBALL = 70
const TF_DMG_CUSTOM_SPELL_MONOCULUS = 71
const TF_DMG_CUSTOM_SPELL_BLASTJUMP = 72
const TF_DMG_CUSTOM_SPELL_BATS = 73
const TF_DMG_CUSTOM_SPELL_TINY = 74
const TF_DMG_CUSTOM_KART = 75
const TF_DMG_CUSTOM_GIANT_HAMMER = 76
const TF_DMG_CUSTOM_RUNE_REFLECT = 77
const TF_DMG_CUSTOM_DRAGONS_FURY_IGNITE = 78
const TF_DMG_CUSTOM_DRAGONS_FURY_BONUS_BURNING = 79
const TF_DMG_CUSTOM_SLAP_KILL = 80
const TF_DMG_CUSTOM_CROC = 81
const TF_DMG_CUSTOM_TAUNTATK_GASBLAST = 82
const TF_DMG_CUSTOM_AXTINGUISHER_BOOSTED = 83
const TF_DMG_CUSTOM_KRAMPUS_MELEE = 84
const TF_DMG_CUSTOM_KRAMPUS_RANGED = 85
const TF_DMG_CUSTOM_TAUNTATK_TRICKSHOT = 86
const TF_DMG_CUSTOM_NUTCRACKER = 87
const TF_DMG_CUSTOM_END = 88

const TEAM_UNASSIGNED = 0
const TEAM_SPECTATOR = 1
const TF_TEAM_PVE_DEFENDERS = 2
const TF_TEAM_RED = 2
const TF_TEAM_BLUE = 3
const TF_TEAM_PVE_INVADERS = 3
const TF_TEAM_COUNT = 4
const TF_TEAM_PVE_INVADERS_GIANTS = 4
const TEAM_ANY = -2
const TEAM_INVALID = -1

const Zero = 0
const Epsilon = 1.19209e-07
const GoldenRatio = 1.61803
const One = 1
const Sqrt2 = 1.41421
const Sqrt3 = 1.73205
const E = 2.71828
const Pi = 3.14159
const Tau = 6.28319

// useless
// const ConstantNamingConvention = "Constants are named as follows: F -> flags, E -> enums, (nothing) -> random values/constants"
const DIST_EPSILON = 0.03125
const MAX_PLAYERS = 101
const MAX_EDICTS = 2048

const IN_ATTACK = 1
const IN_JUMP = 2
const IN_DUCK = 4
const IN_FORWARD = 8
const IN_BACK = 16
const IN_USE = 32
const IN_CANCEL = 64
const IN_LEFT = 128
const IN_RIGHT = 256
const IN_MOVELEFT = 512
const IN_MOVERIGHT = 1024
const IN_ATTACK2 = 2048
const IN_RUN = 4096
const IN_RELOAD = 8192
const IN_ALT1 = 16384
const IN_ALT2 = 32768
const IN_SCORE = 65536
const IN_SPEED = 131072
const IN_WALK = 262144
const IN_ZOOM = 524288
const IN_WEAPON1 = 1048576
const IN_WEAPON2 = 2097152
const IN_BULLRUSH = 4194304
const IN_GRENADE1 = 8388608
const IN_GRENADE2 = 16777216
const IN_ATTACK3 = 33554432

const CONTENTS_EMPTY = 0
const CONTENTS_SOLID = 1
const CONTENTS_WINDOW = 2
const CONTENTS_AUX = 4
const CONTENTS_GRATE = 8
const CONTENTS_SLIME = 16
const CONTENTS_WATER = 32
const CONTENTS_BLOCKLOS = 64
const CONTENTS_OPAQUE = 128
const LAST_VISIBLE_CONTENTS = 128
const ALL_VISIBLE_CONTENTS = 255
const CONTENTS_TESTFOGVOLUME = 256
const CONTENTS_UNUSED = 512
const CONTENTS_UNUSED6 = 1024
const CONTENTS_TEAM1 = 2048
const CONTENTS_TEAM2 = 4096
const CONTENTS_IGNORE_NODRAW_OPAQUE = 8192
const CONTENTS_MOVEABLE = 16384
const CONTENTS_AREAPORTAL = 32768
const CONTENTS_PLAYERCLIP = 65536
const CONTENTS_MONSTERCLIP = 131072
const CONTENTS_CURRENT_0 = 262144
const CONTENTS_CURRENT_90 = 524288
const CONTENTS_CURRENT_180 = 1048576
const CONTENTS_CURRENT_270 = 2097152
const CONTENTS_CURRENT_UP = 4194304
const CONTENTS_CURRENT_DOWN = 8388608
const CONTENTS_ORIGIN = 16777216
const CONTENTS_MONSTER = 33554432
const CONTENTS_DEBRIS = 67108864
const CONTENTS_DETAIL = 134217728
const CONTENTS_TRANSLUCENT = 268435456
const CONTENTS_LADDER = 536870912
const CONTENTS_HITBOX = 1073741824

const DMG_GENERIC = 0
const DMG_CRUSH = 1
const DMG_BULLET = 2
const DMG_SLASH = 4
const DMG_BURN = 8
const DMG_VEHICLE = 16
const DMG_FALL = 32
const DMG_BLAST = 64
const DMG_CLUB = 128
const DMG_SHOCK = 256
const DMG_SONIC = 512
const DMG_ENERGYBEAM = 1024
const DMG_PREVENT_PHYSICS_FORCE = 2048
const DMG_NEVERGIB = 4096
const DMG_ALWAYSGIB = 8192
const DMG_DROWN = 16384
const DMG_PARALYZE = 32768
const DMG_NERVEGAS = 65536
const DMG_POISON = 131072
const DMG_RADIATION = 262144
const DMG_DROWNRECOVER = 524288
const DMG_ACID = 1048576
const DMG_SLOWBURN = 2097152
const DMG_REMOVENORAGDOLL = 4194304
const DMG_PHYSGUN = 8388608
const DMG_PLASMA = 16777216
const DMG_AIRBOAT = 33554432
const DMG_DISSOLVE = 67108864
const DMG_BLAST_SURFACE = 134217728
const DMG_DIRECT = 268435456
const DMG_BUCKSHOT = 536870912

const EF_BONEMERGE = 1
const EF_BRIGHTLIGHT = 2
const EF_DIMLIGHT = 4
const EF_NOINTERP = 8
const EF_MAX_BITS = 10
const EF_NOSHADOW = 16
const EF_NODRAW = 32
const EF_NORECEIVESHADOW = 64
const EF_BONEMERGE_FASTCULL = 128
const EF_ITEM_BLINK = 256
const EF_PARENT_ANIMATES = 512

const EFL_KILLME = 1
const EFL_DORMANT = 2
const EFL_NOCLIP_ACTIVE = 4
const EFL_SETTING_UP_BONES = 8
const EFL_HAS_PLAYER_CHILD = 16
const EFL_KEEP_ON_RECREATE_ENTITIES = 16
const EFL_DIRTY_SHADOWUPDATE = 32
const EFL_NOTIFY = 64
const EFL_FORCE_CHECK_TRANSMIT = 128
const EFL_BOT_FROZEN = 256
const EFL_SERVER_ONLY = 512
const EFL_NO_AUTO_EDICT_ATTACH = 1024
const EFL_DIRTY_ABSTRANSFORM = 2048
const EFL_DIRTY_ABSVELOCITY = 4096
const EFL_DIRTY_ABSANGVELOCITY = 8192
const EFL_DIRTY_SURROUNDING_COLLISION_BOUNDS = 16384
const EFL_DIRTY_SPATIAL_PARTITION = 32768
const EFL_FORCE_ALLOW_MOVEPARENT = 65536
const EFL_IN_SKYBOX = 131072
const EFL_USE_PARTITION_WHEN_NOT_SOLID = 262144
const EFL_TOUCHING_FLUID = 524288
const EFL_IS_BEING_LIFTED_BY_BARNACLE = 1048576
const EFL_NO_ROTORWASH_PUSH = 2097152
const EFL_NO_THINK_FUNCTION = 4194304
const EFL_NO_GAME_PHYSICS_SIMULATION = 8388608
const EFL_CHECK_UNTOUCH = 16777216
const EFL_DONTBLOCKLOS = 33554432
const EFL_DONTWALKON = 67108864
const EFL_NO_DISSOLVE = 134217728
const EFL_NO_MEGAPHYSCANNON_RAGDOLL = 268435456
const EFL_NO_WATER_VELOCITY_CHANGE = 536870912
const EFL_NO_PHYSCANNON_INTERACTION = 1073741824
const EFL_NO_DAMAGE_FORCES = 2147483648

const HIDEHUD_WEAPONSELECTION = 1
const HIDEHUD_FLASHLIGHT = 2
const HIDEHUD_ALL = 4
const HIDEHUD_HEALTH = 8
const HIDEHUD_PLAYERDEAD = 16
const HIDEHUD_BITCOUNT = 18
const HIDEHUD_NEEDSUIT = 32
const HIDEHUD_MISCSTATUS = 64
const HIDEHUD_CHAT = 128
const HIDEHUD_CROSSHAIR = 256
const HIDEHUD_VEHICLE_CROSSHAIR = 512
const HIDEHUD_INVEHICLE = 1024
const HIDEHUD_BONUS_PROGRESS = 2048
const HIDEHUD_BUILDING_STATUS = 4096
const HIDEHUD_CLOAK_AND_FEIGN = 8192
const HIDEHUD_PIPES_AND_CHARGE = 16384
const HIDEHUD_METAL = 32768
const HIDEHUD_TARGET_ID = 65536
const HIDEHUD_MATCH_STATUS = 131072

const NAV_MESH_INVALID = 0
const NAV_MESH_CROUCH = 1
const NAV_MESH_JUMP = 2
const NAV_MESH_PRECISE = 4
const NAV_MESH_NO_JUMP = 8
const NAV_MESH_STOP = 16
const NAV_MESH_RUN = 32
const NAV_MESH_WALK = 64
const NAV_MESH_AVOID = 128
const NAV_MESH_TRANSIENT = 256
const NAV_MESH_DONT_HIDE = 512
const NAV_MESH_STAND = 1024
const NAV_MESH_NO_HOSTAGES = 2048
const NAV_MESH_STAIRS = 4096
const NAV_MESH_NO_MERGE = 8192
const NAV_MESH_OBSTACLE_TOP = 16384
const NAV_MESH_CLIFF = 32768
const NAV_MESH_FIRST_CUSTOM = 65536
const NAV_MESH_LAST_CUSTOM = 67108864
const NAV_MESH_FUNC_COST = 536870912
const NAV_MESH_HAS_ELEVATOR = 1073741824
const NAV_MESH_NAV_BLOCKER = 2147483648

const FL_ONGROUND = 1
const FL_DUCKING = 2
const FL_ANIMDUCKING = 4
const FL_WATERJUMP = 8
const PLAYER_FLAG_BITS = 11
const FL_ONTRAIN = 16
const FL_INRAIN = 32
const FL_FROZEN = 64
const FL_ATCONTROLS = 128
const FL_CLIENT = 256
const FL_FAKECLIENT = 512
const FL_INWATER = 1024
const FL_FLY = 2048
const FL_SWIM = 4096
const FL_CONVEYOR = 8192
const FL_NPC = 16384
const FL_GODMODE = 32768
const FL_NOTARGET = 65536
const FL_AIMTARGET = 131072
const FL_PARTIALGROUND = 262144
const FL_STATICPROP = 524288
const FL_GRAPHED = 1048576
const FL_GRENADE = 2097152
const FL_STEPMOVEMENT = 4194304
const FL_DONTTOUCH = 8388608
const FL_BASEVELOCITY = 16777216
const FL_WORLDBRUSH = 33554432
const FL_OBJECT = 67108864
const FL_KILLME = 134217728
const FL_ONFIRE = 268435456
const FL_DISSOLVING = 536870912
const FL_TRANSRAGDOLL = 1073741824
const FL_UNBLOCKABLE_BY_PLAYER = 2147483648

const FSOLID_CUSTOMRAYTEST = 1
const FSOLID_CUSTOMBOXTEST = 2
const FSOLID_NOT_SOLID = 4
const FSOLID_TRIGGER = 8
const FSOLID_MAX_BITS = 10
const FSOLID_NOT_STANDABLE = 16
const FSOLID_VOLUME_CONTENTS = 32
const FSOLID_FORCE_WORLD_ALIGNED = 64
const FSOLID_USE_TRIGGER_BOUNDS = 128
const FSOLID_ROOT_PARENT_ALIGNED = 256
const FSOLID_TRIGGER_TOUCH_DEBRIS = 512

const SURF_LIGHT = 1
const SURF_SKY2D = 2
const SURF_SKY = 4
const SURF_WARP = 8
const SURF_TRANS = 16
const SURF_NOPORTAL = 32
const SURF_TRIGGER = 64
const SURF_NODRAW = 128
const SURF_HINT = 256
const SURF_SKIP = 512
const SURF_NOLIGHT = 1024
const SURF_BUMPLIGHT = 2048
const SURF_NOSHADOWS = 4096
const SURF_NODECALS = 8192
const SURF_NOCHOP = 16384
const SURF_HITBOX = 32768

const TAUNT_BASE_WEAPON = 0
const TAUNT_MISC_ITEM = 1
const TAUNT_SHOW_ITEM = 2
const TAUNT_LONG = 3
const TAUNT_SPECIAL = 4

const REMOVE_ON_DEATH = 1
const AGGRESSIVE = 2
const IS_NPC = 4
const SUPPRESS_FIRE = 8
const DISABLE_DODGE = 16
const BECOME_SPECTATOR_ON_DEATH = 32
const QUOTA_MANANGED = 64
const RETAIN_BUILDINGS = 128
const SPAWN_WITH_FULL_CHARGE = 256
const ALWAYS_CRIT = 512
const IGNORE_ENEMIES = 1024
const HOLD_FIRE_UNTIL_FULL_RELOAD = 2048
const PRIORITIZE_DEFENSE = 4096
const ALWAYS_FIRE_WEAPON = 8192
const TELEPORT_TO_HINT = 16384
const MINIBOSS = 32768
const USE_BOSS_HEALTH_BAR = 65536
const IGNORE_FLAG = 131072
const AUTO_JUMP = 262144
const AIR_CHARGE_ONLY = 524288
const PREFER_VACCINATOR_BULLETS = 1048576
const PREFER_VACCINATOR_BLAST = 2097152
const PREFER_VACCINATOR_FIRE = 4194304
const BULLET_IMMUNE = 8388608
const BLAST_IMMUNE = 16777216
const FIRE_IMMUNE = 33554432
const PARACHUTE = 67108864
const PROJECTILE_SHIELD = 134217728

const TF_NAV_INVALID = 0
const TF_NAV_BLOCKED = 1
const TF_NAV_SPAWN_ROOM_RED = 2
const TF_NAV_SPAWN_ROOM_BLUE = 4
const TF_NAV_SPAWN_ROOM_EXIT = 8
const TF_NAV_HAS_AMMO = 16
const TF_NAV_HAS_HEALTH = 32
const TF_NAV_CONTROL_POINT = 64
const TF_NAV_BLUE_SENTRY_DANGER = 128
const TF_NAV_RED_SENTRY_DANGER = 256
const TF_NAV_BLUE_SETUP_GATE = 2048
const TF_NAV_RED_SETUP_GATE = 4096
const TF_NAV_BLOCKED_AFTER_POINT_CAPTURE = 8192
const TF_NAV_BLOCKED_UNTIL_POINT_CAPTURE = 16384
const TF_NAV_BLUE_ONE_WAY_DOOR = 32768
const TF_NAV_RED_ONE_WAY_DOOR = 65536
const TF_NAV_WITH_SECOND_POINT = 131072
const TF_NAV_WITH_THIRD_POINT = 262144
const TF_NAV_WITH_FOURTH_POINT = 524288
const TF_NAV_WITH_FIFTH_POINT = 1048576
const TF_NAV_SNIPER_SPOT = 2097152
const TF_NAV_SENTRY_SPOT = 4194304
const TF_NAV_ESCAPE_ROUTE = 8388608
const TF_NAV_ESCAPE_ROUTE_VISIBLE = 16777216
const TF_NAV_NO_SPAWNING = 33554432
const TF_NAV_RESCUE_CLOSET = 67108864
const TF_NAV_BOMB_CAN_DROP_HERE = 134217728
const TF_NAV_DOOR_NEVER_BLOCKS = 268435456
const TF_NAV_DOOR_ALWAYS_BLOCKS = 536870912
const TF_NAV_UNBLOCKABLE = 1073741824
const TF_NAV_PERSISTENT_ATTRIBUTES = 1988098048


// Comments are per-symbol so they're unfortunately need to be duplicated


// Folded NetProps methods, can be achieved by running the following:
foreach (name, method in ::CNetPropManager)
	if (name != "IsValid")
		getroottable()[name] <- method.bindenv(::NetProps)

/**
 * Returns the size of a netprop array, or `-1`.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {property_array} property_name
 * @returns {integer}
 * @nodiscard
 */
GetPropArraySize <- NetProps.GetPropArraySize

/**
 * Reads an `EHANDLE`-valued netprop.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {entity_property} property_name
 * @returns {CBaseEntity|null} `null` if property is not found.
 * @nodiscard
 */
GetPropEntity <- NetProps.GetPropEntity

/**
 * Reads an `EHANDLE`-valued netprop from an array.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {entity_array_property} property_name
 * @param {integer} array_element
 * @returns {CBaseEntity|null} `null` if not found.
 * @nodiscard
 */
GetPropEntityArray <- NetProps.GetPropEntityArray

/**
 * Reads a boolean-valued netprop.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {bool_property} property_name
 * @returns {bool} `false` if property is not found.
 * @nodiscard
 */
GetPropBool <- NetProps.GetPropBool

/**
 * Reads a boolean-valued netprop from an array.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {bool_array_property} property_name
 * @param {integer} array_element
 * @returns {bool} `false` if not found.
 * @nodiscard
 */
GetPropBoolArray <- NetProps.GetPropBoolArray

/**
 * Reads a float-valued netprop.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {float_property} property_name
 * @returns {float} `-1.0` if property is not found.
 * @nodiscard
 */
GetPropFloat <- NetProps.GetPropFloat

/**
 * Reads a float-valued netprop from an array.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {float_array_property} property_name
 * @param {integer} array_element
 * @returns {float} `-1.0` if not found.
 * @nodiscard
 */
GetPropFloatArray <- NetProps.GetPropFloatArray

/**
 * Fills in a passed table with property info for the provided entity.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {property} property_name
 * @param {integer} array_element
 * @param {table} result
 * @returns {bool}
 * @nodiscard
 */
GetPropInfo <- NetProps.GetPropInfo

/**
 * Reads an integer-valued netprop.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {integer_property} property_name
 * @returns {integer} `-1` if property is not found.
 * @nodiscard
 */
GetPropInt <- NetProps.GetPropInt

/**
 * Reads an integer-valued netprop from an array.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {integer_array_property} property_name
 * @param {integer} array_element
 * @returns {integer} `-1` if not found.
 * @nodiscard
 */
GetPropIntArray <- NetProps.GetPropIntArray

/**
 * Reads a string-valued netprop.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {string_property} property_name
 * @returns {string} Empty string if property is not found.
 * @nodiscard
 */
GetPropString <- NetProps.GetPropString

/**
 * Reads a string-valued netprop from an array.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {string_array_property} property_name
 * @param {integer} array_element
 * @returns {string} Empty string if not found.
 * @nodiscard
 */
GetPropStringArray <- NetProps.GetPropStringArray

/**
 * Returns the name of the netprop type as a string.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {property} property_name
 * @returns {string|null} `null` if not found.
 * @nodiscard
 */
GetPropType <- NetProps.GetPropType

/**
 * Reads a 3D vector-valued netprop.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {vector_property} property_name
 * @returns {Vector} `Vector(0,0,0)` if not found.
 * @nodiscard
 */
GetPropVector <- NetProps.GetPropVector

/**
 * Reads a 3D vector-valued netprop from an array.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {vector_array_property} property_name
 * @param {integer} array_element
 * @returns {Vector} `Vector(0,0,0)` if not found.
 * @nodiscard
 */
GetPropVectorArray <- NetProps.GetPropVectorArray

/**
 * Fills in a passed table with all props of a specified type.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {integer} prop_type `0` = SendTable, `1` = DataMap.
 * @param {table} result
 */
GetTable <- NetProps.GetTable

/**
 * Checks if a netprop exists.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {property} property_name
 * @returns {bool}
 * @nodiscard
 */
HasProp <- NetProps.HasProp

/**
 * Sets a netprop to the specified boolean.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {bool_property} property_name
 * @param {bool} value
 */
SetPropBool <- NetProps.SetPropBool

/**
 * Sets a netprop from an array to the specified boolean.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {bool_array_property} property_name
 * @param {bool} value
 * @param {integer} array_element
 */
SetPropBoolArray <- NetProps.SetPropBoolArray

/**
 * Sets an `EHANDLE`-valued netprop to reference the specified entity.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {entity_property} property_name
 * @param {CBaseEntity|null} value
 */
SetPropEntity <- NetProps.SetPropEntity

/**
 * Sets an `EHANDLE`-valued netprop from an array to reference the specified entity.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {entity_array_property} property_name
 * @param {CBaseEntity|null} value
 * @param {integer} array_element
 */
SetPropEntityArray <- NetProps.SetPropEntityArray

/**
 * Sets a netprop to the specified float.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {float_property} property_name
 * @param {float} value
 */
SetPropFloat <- NetProps.SetPropFloat

/**
 * Sets a netprop from an array to the specified float.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {float_array_property} property_name
 * @param {float} value
 * @param {integer} array_element
 */
SetPropFloatArray <- NetProps.SetPropFloatArray

/**
 * Sets a netprop to the specified integer.
 *
 * **Warning**: Do not override `m_iTeamNum` netprops on players or Engineer buildings permanently.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {integer_property} property_name
 * @param {integer} value
 */
SetPropInt <- NetProps.SetPropInt

/**
 * Sets a netprop from an array to the specified integer.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {integer_array_property} property_name
 * @param {integer} value
 * @param {integer} array_element
 */
SetPropIntArray <- NetProps.SetPropIntArray

/**
 * Sets a netprop to the specified string.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {string_property} property_name
 * @param {string|null} value
 */
SetPropString <- NetProps.SetPropString

/**
 * Sets a netprop from an array to the specified string.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {string_array_property} property_name
 * @param {string|null} value
 * @param {integer} array_element
 */
SetPropStringArray <- NetProps.SetPropStringArray

/**
 * Sets a netprop to the specified vector.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {vector_property} property_name
 * @param {Vector} value
 */
SetPropVector <- NetProps.SetPropVector

/**
 * Sets a netprop from an array to the specified vector.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {vector_array_property} property_name
 * @param {Vector} value
 * @param {integer} array_element
 */
SetPropVectorArray <- NetProps.SetPropVectorArray


// Folded NavMesh methods, can be achieved by running the following:
foreach (name, method in ::CNavMesh)
	if (name != "IsValid")
		getroottable()[name] <- method.bindenv(::NavMesh)

/**
 * Get nav area from ray.
 * @type {function}
 * @param {Vector} start_pos
 * @param {Vector} end_pos
 * @param {CTFNavArea|null} ignore_area
 * @returns {CTFNavArea|null}
 * @nodiscard
 */
FindNavAreaAlongRay <- NavMesh.FindNavAreaAlongRay

/**
 * Fills a passed in table of all nav areas.
 * @type {function}
 * @param {table} result Resulting shape: `{"area0": CTFNavArea, "area1": CTFNavArea, ...}`
 */
GetAllAreas <- NavMesh.GetAllAreas

/**
 * Fills a passed in table of all nav areas that have the specified attributes.
 * @type {function}
 * @param {integer} bits See [Constants.FNavAttributeType](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#FNavAttributeType)
 * @param {table} result
 */
GetAreasWithAttributes <- NavMesh.GetAreasWithAttributes

/**
 * Given a position in the world, return the nav area closest to or below that height.
 * @type {function}
 * @param {Vector} origin
 * @param {float} beneath
 * @returns {CTFNavArea|null}
 * @nodiscard
 */
GetNavArea <- NavMesh.GetNavArea

/**
 * Get nav area by ID.
 * @type {function}
 * @param {integer} area_id
 * @returns {CTFNavArea|null}
 * @nodiscard
 */
GetNavAreaByID <- NavMesh.GetNavAreaByID

/**
 * Return total number of nav areas.
 * @type {function}
 * @returns {integer}
 * @nodiscard
 */
GetNavAreaCount <- NavMesh.GetNavAreaCount

/**
 * Fills the table with areas from a path.
 *
 * **Note**: The areas are passed from end area to the start area.
 * @type {function}
 * @param {CTFNavArea} start_area
 * @param {CTFNavArea} end_area
 * @param {Vector} goal_pos
 * @param {float} max_path_length
 * @param {integer} team See [Constants.ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)
 * @param {bool} ignore_nav_blockers
 * @param {table} result
 * @returns {bool} Whether a path was found.
 */
GetNavAreasFromBuildPath <- NavMesh.GetNavAreasFromBuildPath

/**
 * Fills a passed in table of nav areas within radius.
 * @type {function}
 * @param {Vector} origin
 * @param {float} radius
 * @param {table} result
 */
GetNavAreasInRadius <- NavMesh.GetNavAreasInRadius

/**
 * Fills passed in table with areas overlapping entity's extent.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {table} result
 */
GetNavAreasOverlappingEntityExtent <- NavMesh.GetNavAreasOverlappingEntityExtent

/**
 * Given a position in the world, return the nav area closest to or below that height.
 * @type {function}
 * @param {Vector} origin
 * @param {float} max_distance
 * @param {bool} check_los
 * @param {bool} check_ground
 * @returns {CTFNavArea|null}
 * @nodiscard
 */
GetNearestNavArea <- NavMesh.GetNearestNavArea

/**
 * Fills a passed in table of all obstructing entities.
 * @type {function}
 * @param {table} result
 */
GetObstructingEntities <- NavMesh.GetObstructingEntities

/**
 * Returns `true` if a path exists.
 * @type {function}
 * @param {CTFNavArea} start_area
 * @param {CTFNavArea} end_area
 * @param {Vector} goal_pos
 * @param {float} max_path_length
 * @param {integer} team See [Constants.ETFTeam](https://developer.valvesoftware.com/wiki/Team_Fortress_2/Scripting/Script_Functions/Constants#ETFTeam)
 * @param {bool} ignore_nav_blockers
 * @returns {bool}
 * @nodiscard
 */
NavAreaBuildPath <- NavMesh.NavAreaBuildPath

/**
 * Compute distance between two areas.
 * @type {function}
 * @param {CTFNavArea} start_area
 * @param {CTFNavArea} end_area
 * @param {float} max_path_length
 * @returns {float} `-1.0` if can't reach `end_area` from `start_area`.
 * @nodiscard
 */
NavAreaTravelDistance <- NavMesh.NavAreaTravelDistance

/**
 * Registers avoidance obstacle.
 * @type {function}
 * @param {CBaseEntity} entity
 */
RegisterAvoidanceObstacle <- NavMesh.RegisterAvoidanceObstacle

/**
 * Unregisters avoidance obstacle.
 * @type {function}
 * @param {CBaseEntity} entity
 */
UnregisterAvoidanceObstacle <- NavMesh.UnregisterAvoidanceObstacle


// Folded Convars methods, can be achieved by running the following:
foreach (name, method in ::Convars.getclass())
	if (name != "IsValid")
		getroottable()[name] <- method.bindenv(::Convars)

/**
 * Returns the convar as a bool. May return `null` if no such convar.
 * @type {function}
 * @param {convar} name
 * @returns {bool|null}
 * @nodiscard
 */
GetBool <- Convars.GetBool

/**
 * Returns the convar value for the entindex as a string. Only works on `FCVAR_USERINFO` convars.
 * @type {function}
 * @param {client_convar} name
 * @param {integer} entindex
 * @returns {string}
 * @nodiscard
 */
GetClientConvarValue <- Convars.GetClientConvarValue

/**
 * Returns the convar as an integer. May return `null` if no such convar.
 *
 * **Warning**: The entire convar list is searched each time (slow). Cache results if used often.
 * @type {function}
 * @param {convar} name
 * @returns {integer|null}
 * @nodiscard
 */
GetInt <- Convars.GetInt

/**
 * Returns the convar as a string. May return `null` if no such convar.
 *
 * **Warning**: The entire convar list is searched each time (slow). Cache results if used often.
 * @type {function}
 * @param {convar} name
 * @returns {string|null}
 * @nodiscard
 */
GetStr <- Convars.GetStr

/**
 * Returns the convar as a float. May return `null` if no such convar.
 *
 * **Warning**: The entire convar list is searched each time (slow). Cache results if used often.
 * @type {function}
 * @param {convar} name
 * @returns {float|null}
 * @nodiscard
 */
GetFloat <- Convars.GetFloat

/**
 * Checks if the convar is allowed to be used (in cfg/vscript_convar_allowlist.txt).
 * @type {function}
 * @param {convar} name
 * @returns {bool}
 * @nodiscard
 */
IsConVarOnAllowList <- Convars.IsConVarOnAllowList

/**
 * Sets the value of the convar. The convar must be in cfg/vscript_convar_allowlist.txt.
 * The original value is saved and reset on map change.
 * @type {function}
 * @param {convar} name
 * @param {any} value
 */
SetValue <- Convars.SetValue


// Folded Entities methods, can be achieved by running the following:
foreach (name, method in ::CEntities)
	if (name != "IsValid")
		getroottable()[name] <- method.bindenv(::Entities)

/**
 * Creates an entity by classname.
 * @type {function}
 * @param {classname} classname
 * @returns {CBaseEntity|null} `null` if no entity type could be inferred.
 */
CreateByClassname <- Entities.CreateByClassname

/**
 * Dispatches spawn of an entity. Use this on entities created via `CreateByClassname`.
 * @type {function}
 * @param {CBaseEntity} entity
 */
DispatchSpawn <- Entities.DispatchSpawn

/**
 * Find entities by classname. Pass `null` to start, or previous entity to continue.
 * @type {function}
 * @param {CBaseEntity|null} previous
 * @param {classname_search} classname
 * @returns {CBaseEntity|null}
 * @nodiscard
 */
FindByClassname <- Entities.FindByClassname

/**
 * Find entities by classname nearest to a point within a radius.
 * @type {function}
 * @param {classname_search} classname
 * @param {Vector} center
 * @param {float} radius
 * @returns {CBaseEntity|null}
 * @nodiscard
 */
FindByClassnameNearest <- Entities.FindByClassnameNearest

/**
 * Find entities by classname within a radius. Pass `null` to start, or previous to continue.
 * @type {function}
 * @param {CBaseEntity|null} previous
 * @param {classname_search} classname
 * @param {Vector} center
 * @param {float} radius
 * @returns {CBaseEntity|null}
 * @nodiscard
 */
FindByClassnameWithin <- Entities.FindByClassnameWithin

/**
 * Find entities by model keyvalue. Pass `null` to start, or previous to continue.
 * @type {function}
 * @param {CBaseEntity|null} previous
 * @param {string} model_name
 * @returns {CBaseEntity|null}
 * @nodiscard
 */
FindByModel <- Entities.FindByModel

/**
 * Find entities by targetname keyvalue. Pass `null` to start, or previous to continue.
 * @type {function}
 * @param {CBaseEntity|null} previous
 * @param {string} targetname
 * @returns {CBaseEntity|null}
 * @nodiscard
 */
FindByName <- Entities.FindByName

/**
 * Find entities by targetname nearest to a point within a radius.
 * @type {function}
 * @param {string} targetname
 * @param {Vector} center
 * @param {float} radius
 * @returns {CBaseEntity|null}
 * @nodiscard
 */
FindByNameNearest <- Entities.FindByNameNearest

/**
 * Find entities by targetname within a radius. Pass `null` to start, or previous to continue.
 * @type {function}
 * @param {CBaseEntity|null} previous
 * @param {string} targetname
 * @param {Vector} center
 * @param {float} radius
 * @returns {CBaseEntity|null}
 * @nodiscard
 */
FindByNameWithin <- Entities.FindByNameWithin

/**
 * Find entities by their target keyvalue. Pass `null` to start, or previous to continue.
 * @type {function}
 * @param {CBaseEntity|null} previous
 * @param {string} target
 * @returns {CBaseEntity|null}
 * @nodiscard
 */
FindByTarget <- Entities.FindByTarget

/**
 * Find entities within a radius. Pass `null` to start, or previous to continue.
 * @type {function}
 * @param {CBaseEntity|null} previous
 * @param {Vector} center
 * @param {float} radius
 * @returns {CBaseEntity|null}
 * @nodiscard
 */
FindInSphere <- Entities.FindInSphere

/**
 * Begin an iteration over the list of entities. The first entity is always worldspawn.
 * @type {function}
 * @returns {CBaseEntity}
 * @nodiscard
 */
First <- Entities.First

/**
 * Returns the next entity after the given one in the list.
 * @type {function}
 * @param {CBaseEntity} previous
 * @returns {CBaseEntity|null}
 * @nodiscard
 */
Next <- Entities.Next

// Folded EntityOutputs methods, can be achieved by running the following:
foreach (name, method in ::CScriptEntityOutputs)
	if (name != "IsValid")
		getroottable()[name] <- method.bindenv(::EntityOutputs)

/**
 * Adds a new output to the entity.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {string} output_name
 * @param {string} targetname
 * @param {output} input_name
 * @param {string|null} parameter
 * @param {float} delay
 * @param {integer} times_to_fire
 */
AddOutput <- EntityOutputs.AddOutput

/**
 * Returns the number of array elements.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {output} output_name
 * @returns {integer}
 * @nodiscard
 */
GetNumElements <- EntityOutputs.GetNumElements

/**
 * Fills the passed table with output information.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {output} output_name
 * @param {table} result
 * @param {integer} array_element
 */
GetOutputTable <- EntityOutputs.GetOutputTable

/**
 * Returns `true` if an action exists for the output.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {output} output_name
 * @returns {bool}
 * @nodiscard
 */
HasAction <- EntityOutputs.HasAction

/**
 * Returns `true` if the output exists.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {output} output_name
 * @returns {bool}
 * @nodiscard
 */
HasOutput <- EntityOutputs.HasOutput

/**
 * Removes an output from the entity.
 * @type {function}
 * @param {CBaseEntity} entity
 * @param {string} output_name
 * @param {string} targetname
 * @param {output} input_name
 * @param {string|null} parameter
 */
RemoveOutput <- EntityOutputs.RemoveOutput


// Folded EntityOutputs methods, can be achieved by running the following:
foreach (name, method in ::CPlayerVoiceListener)
	if (name != "IsValid")
		getroottable()[name] <- method.bindenv(::PlayerVoiceListener)

/**
 * Returns the number of seconds the player has been continuously speaking.
 * @type {function}
 * @param {integer} player_index
 * @returns {float}
 * @nodiscard
 */
GetPlayerSpeechDuration <- PlayerVoiceListener.GetPlayerSpeechDuration

/**
 * Returns whether the player specified is speaking.
 * @type {function}
 * @param {integer} player_index
 * @returns {bool}
 * @nodiscard
 */
IsPlayerSpeaking <- PlayerVoiceListener.IsPlayerSpeaking
