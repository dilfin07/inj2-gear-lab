"""Injustice 2 Mobile stat and threat maths.

The same calculations the web calculator performs, exposed for scripting:
character attack/health at a given level and star rating, gear effect values,
and the threat score.
"""
import json, math, os

DATA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')

# skill slot order
SKILL_SLOTS = ['SP1', 'SP2', 'SP3', 'Passive', 'SuperMove', 'Passive2', 'Passive3', 'ClassPassive']
# per-slot threat weight, in slot order
SKILL_THREAT_WEIGHTS = ['Special1Weight', 'Special2Weight', 'Special3Weight', 'PassiveWeight',
                        'SuperMoveWeight', 'Passive2Weight', 'Passive3Weight', 'ClassPassiveWeight']


def _load(name):
    with open(os.path.join(DATA, name)) as f:
        return json.load(f)


class Game:
    def __init__(self):
        self.characters = _load('characters.json')
        self.gear = _load('gear.json')
        self.globals = _load('globals.json')
        self.enums = _load('enums.json')

    # ------------------------------------------------------------------ stats
    def star_scalars(self, char, star):
        """Star scalars for a rating (1-based); some characters override the global table."""
        table = char.get('starTableOverride') or self.globals['starRatingStatTable']
        if not star:
            star = char.get('startingStar') or 1
        return table[min(star, len(table)) - 1]

    def total_attack(self, char, level, star):
        s = self.star_scalars(char, star)
        v = char['attack'] * s['baseAttackScalar'] + \
            char['attackScalar'] * s['attackScalarScalar'] * level
        return math.floor(v + 0.5)

    def total_health(self, char, level, star):
        s = self.star_scalars(char, star)
        v = char['health'] * s['baseHealthScalar'] + \
            char['healthScalar'] * s['healthScalarScalar'] * level
        return math.floor(v + 0.5)

    def max_level(self, star):
        for row in self.globals['maxLevelPerStar']:
            if row['StarRating'] == star:
                return row['MaxLevel']
        return self.globals['maxLevelPerStar'][-1]['MaxLevel']

    # ------------------------------------------------------------------ gear
    @staticmethod
    def gear_effect_value(effect, gear_level):
        """A gear or artifact effect's magnitude at a given gear level.

        Level 1 is the base value; each further level adds perLevel.
        """
        return effect.get('base', 0.0) + effect.get('perLevel', 0.0) * (gear_level - 1)

    def gear_for(self, character_key):
        own = {g['slot']: g for g in self.gear.values() if g['character'] == character_key}
        return own

    def artifacts(self):
        return {k: g for k, g in self.gear.items() if g['slot'] == 'Artifact'}

    # ---------------------------------------------------------------- threat
    def threat(self, stats, skill_levels=None, base_skill_mult=None,
               artifact_term=0.0, traits_mult=1.0, star=0):
        """Threat score for a set of stats.

        `stats` is a dict of stat values (Attack, Health, Defense,
        CritChance, CritDamageMult, LethalChance, ArmorPierceChance, FastAttackChance,
        FastAttackHits, CritChanceReduction, StunChanceReduction, DOTChanceReduction,
        BlockMitigation). `skill_levels` / `base_skill_mult` are 8-element lists ordered
        like SKILL_SLOTS.
        """
        w = self.globals['threat']
        g = lambda k: stats.get(k, 0.0)
        skill_levels = skill_levels or [0] * 8
        base_skill_mult = base_skill_mult or [0.0] * 8

        atk_w = g('Attack') * w['AttackWeight']

        # 1) offence
        offence = atk_w * (1.0
                           + g('CritChance') * g('CritDamageMult') * w['CritAttackWeight']
                           + g('FastAttackChance') * g('FastAttackHits') * w['FastAttackWeight']
                           + g('LethalChance') * w['LethalChanceWeight']
                           + g('ArmorPierceChance') * w['ArmorPierceChanceWeight'])

        # 2) skills (+ artifact contribution, also scaled by attack*AttackWeight)
        skills = sum(base_skill_mult[i] * skill_levels[i] * w[SKILL_THREAT_WEIGHTS[i]]
                     for i in range(8))
        skills = atk_w * skills + atk_w * artifact_term

        # 3) effective health: (1 - Defense) rounded to 4 decimals, with a small guard
        defense = math.floor((1.0 - g('Defense')) * 10000.0 + 0.5) / 10000.0
        ehp = g('Health') * w['HealthWeight'] / (defense + 1e-5)

        # 4) resistances
        resist = g('Health') * (g('CritChanceReduction') * w['CritChanceResistanceWeight']
                                + g('StunChanceReduction') * w['StunChanceResistanceWeight']
                                + g('DOTChanceReduction') * w['DOTChanceResistanceWeight']
                                + g('BlockMitigation') * w['BlockMitigationWeight'])

        total = sum(math.floor(x + 0.5) for x in (offence, skills, ehp, resist))
        scalars = w.get('StarRatingScalars') or []
        star_scalar = scalars[star - 1] if 1 <= star <= len(scalars) else 1.0
        return math.floor(total * traits_mult * star_scalar + 0.5)

    def character_threat(self, char, level, star, skill_levels=None, defense=0.0,
                         extra=None):
        """Convenience wrapper: threat for a bare character (no gear) at level/star."""
        stats = {
            'Attack': self.total_attack(char, level, star),
            'Health': self.total_health(char, level, star),
            'Defense': defense,
            'CritChance': char['critChance'],
            'CritDamageMult': char['critMultiplier'],
            'LethalChance': char['lethalChance'],
            'FastAttackChance': char['fastAttackChance'],
            'FastAttackHits': 1.0,
        }
        stats.update(extra or {})
        return self.threat(stats, skill_levels=skill_levels,
                           traits_mult=char.get('threatTraitsMultiplier') or 1.0, star=star)


if __name__ == '__main__':
    import sys
    game = Game()
    key = sys.argv[1] if len(sys.argv) > 1 else 'Aquaman_A'
    level = int(sys.argv[2]) if len(sys.argv) > 2 else 60
    star = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    c = game.characters[key]
    print(f"{key}: {c['class']} / {c['alignment']} / tier {c['tier']}")
    print(f"  base  attack={c['attack']} (+{c['attackScalar']}/lvl)  "
          f"health={c['health']} (+{c['healthScalar']}/lvl)")
    print(f"  lvl {level}, {star}*  ->  attack={game.total_attack(c, level, star)}  "
          f"health={game.total_health(c, level, star)}")
    print(f"  threat (no gear, skills lvl 1) = "
          f"{game.character_threat(c, level, star, skill_levels=[1]*8)}")
    print('  gear slots:')
    for slot, g in sorted(game.gear_for(key).items()):
        eff = ', '.join(f"{e.get('stat', e['type'])} {e.get('base', 0):.3g}"
                        f"+{e.get('perLevel', 0):.3g}/lvl" for e in g['coreEffects'])
        print(f'    {slot:10s} {g["key"]:28s} {eff}')
